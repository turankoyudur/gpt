import fs from "fs";
import path from "path";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { AppError, ErrorCodes } from "../../core/errors";
import { getLogger } from "../../core/logger";
import { getPrisma } from "../../db/prisma";
import { SettingsService } from "../settings/settings.service";
import { RconService } from "../rcon/rcon.service";

/**
 * Manages the DayZ server process.
 *
 * This is intentionally kept as a lightweight process supervisor.
 * If you want a "production grade" process manager later,
 * you can swap this with a Windows service (NSSM) or PM2.
 */
export class ServerControlService {
  private readonly db = getPrisma();
  private readonly settings = new SettingsService(this.db);
  private readonly log = getLogger();
  private readonly rcon = new RconService();

  // A single managed server process (v0.1)
  private static proc: ChildProcessWithoutNullStreams | null = null;
  private static startedAt: Date | null = null;
  private static lastExit: { code: number | null; signal: NodeJS.Signals | null } | null = null;

  async status() {
    return {
      running: !!ServerControlService.proc,
      pid: ServerControlService.proc?.pid ?? null,
      startedAt: ServerControlService.startedAt?.toISOString() ?? null,
      lastExit: ServerControlService.lastExit,
    };
  }

  /**
   * Starts DayZServer_x64.exe with params derived from Settings + enabled mods.
   */
  async start() {
    if (ServerControlService.proc) {
      return { ok: true, alreadyRunning: true, ...(await this.status()) };
    }

    const s = await this.settings.get();
    const exe = await this.settings.getDayzExecutablePath();

    // Resolve server config path (serverDZ.cfg by default)
    const serverCfg = path.join(s.dayzServerPath, s.serverConfigFile);

    // Build -mod param (enabled mods -> junction folders under DayZ server dir)
    const enabledMods = await this.db.mod.findMany({ where: { enabled: true } });
    await ensureJunctionsForMods({ dayzServerPath: s.dayzServerPath, mods: enabledMods });

    const modArg = enabledMods.length
      ? `-mod=${enabledMods.map((m) => `@${m.workshopId}`).join(";")}`
      : null;

    const args = [
      `-config=${serverCfg}`,
      `-profiles=${s.profilesPath}`,
      `-port=${s.serverPort}`,
      ...(modArg ? [modArg] : []),
    ];

    // User-provided raw args from the Settings UI.
    // This keeps the panel flexible without forcing manual file edits.
    const extraArgs = splitArgs(String((s as any).additionalLaunchArgs ?? ""));
    if (extraArgs.length) args.push(...extraArgs);

    // Spawn DayZ server process
    const child = spawn(exe, args, {
      cwd: s.dayzServerPath,
      windowsHide: true,
    });

    ServerControlService.proc = child;
    ServerControlService.startedAt = new Date();

    // Persist stdout/stderr to a rolling server log file (best effort)
    const outFile = path.resolve(process.cwd(), "data", "logs", "dayz-server-current.log");
    const outStream = fs.createWriteStream(outFile, { flags: "a" });
    child.stdout.pipe(outStream);
    child.stderr.pipe(outStream);

    child.on("close", (code, signal) => {
      ServerControlService.proc = null;
      ServerControlService.lastExit = { code, signal };
      ServerControlService.startedAt = null;
      try {
        outStream.end();
      } catch {
        // ignore
      }
    });

    // After the server starts, try to auto-connect RCON (if enabled in Settings).
    // This runs in the background so the /start request returns immediately.
    void this.autoConnectRconWithRetry();

    return { ok: true, args, ...(await this.status()) };
  }

  /**
   * Auto-connects RCON after the server is launched.
   *
   * This is best-effort and safe:
   * - If Settings are not configured, it stops silently.
   * - If connection fails, it retries for a while.
   * - It never throws (so it won't crash the Node process).
   */
  private async autoConnectRconWithRetry() {
    try {
      const s = await this.settings.get();
      if (!s.rconAutoConnect) return;

      // If the server is not running anymore, abort.
      if (!ServerControlService.proc) return;

      const rcon = new RconService();

      // "Server fully started" is hard to detect reliably.
      // For v0.1, we wait + retry until it connects.
      const maxAttempts = 30; // ~5 minutes with 10s interval
      const intervalMs = 10000;

      // Initial wait so we don't connect too early.
      await delay(15000);

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        // Stop retrying if the server process exited.
        if (!ServerControlService.proc) return;

        const res: any = await rcon.autoConnectIfEnabled();
        if (res?.ok) {
          this.log.info("RCON auto-connect succeeded", {
            code: "RCON_AUTOCONNECT_OK",
            context: { attempt },
          });
          return;
        }

        this.log.info("RCON auto-connect retry", {
          code: "RCON_AUTOCONNECT_RETRY",
          context: { attempt, maxAttempts, reason: res?.reason ?? res?.error ?? "unknown" },
        });

        await delay(intervalMs);
      }

      this.log.warn("RCON auto-connect gave up", {
        code: "RCON_AUTOCONNECT_GIVEUP",
        context: { maxAttempts },
      });
    } catch (err) {
      this.log.warn("RCON auto-connect crashed (ignored)", {
        code: ErrorCodes.RCON_CONNECTION_FAILED,
        context: { message: (err as any)?.message ?? String(err) },
      });
    }
  }

  /**
   * Stops the process.
   *
   * NOTE: We attempt a graceful RCON shutdown if already connected,
   * then fall back to a hard kill after a short wait.
   */
  async stop() {
    const proc = ServerControlService.proc;
    if (!proc) return { ok: true, alreadyStopped: true };

    try {
      let requestedShutdown = false;

      try {
        if (this.rcon.status().connected) {
          const res = await this.rcon.command("#shutdown");
          requestedShutdown = true;
          this.log.info("RCON shutdown command sent", {
            code: "RCON_SHUTDOWN_SENT",
            context: { response: res?.response ?? res },
          });
        } else {
          this.log.info("RCON shutdown skipped (not connected)", {
            code: "RCON_SHUTDOWN_SKIPPED",
          });
        }
      } catch (err) {
        this.log.warn("RCON shutdown command failed", {
          code: ErrorCodes.RCON_COMMAND_FAILED,
          context: { message: (err as any)?.message ?? String(err) },
        });
      }

      if (requestedShutdown) {
        const graceful = await waitForExit(proc, 10000);
        if (graceful) return { ok: true, graceful: true };
      }

      proc.kill();
      return { ok: true, graceful: false };
    } catch (err) {
      throw new AppError({
        code: ErrorCodes.SERVER_PROCESS_STOP_FAILED,
        status: 500,
        message: "Failed to stop DayZ server process",
        cause: err,
      });
    }
  }

  async restart() {
    await this.stop();
    // Small delay to let OS release ports
    await new Promise((r) => setTimeout(r, 2000));
    return this.start();
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function waitForExit(proc: ChildProcessWithoutNullStreams, timeoutMs: number) {
  return new Promise<boolean>((resolve) => {
    let resolved = false;
    const onClose = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      resolve(true);
    };
    const timer = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      proc.off("close", onClose);
      resolve(false);
    }, timeoutMs);

    proc.once("close", onClose);
  });
}

/**
 * Splits a command line string into arguments, respecting quotes.
 *
 * Example:
 *   - "-dologs -logFile=profiles\server.log" => ["-dologs", "-logFile=profiles\server.log"]
 *   - "-mod=... -name=\"My Server\"" => ["-mod=...", "-name=My Server"]
 */
function splitArgs(input: string) {
  const out: string[] = [];
  const re = /\s*([^"\s]+|"(?:\\.|[^\\"])*")\s*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input))) {
    let token = m[1] ?? "";
    if (token.startsWith('"') && token.endsWith('"')) {
      token = token.slice(1, -1).replace(/\\"/g, '"');
    }
    if (token) out.push(token);
  }
  return out;
}

async function ensureJunctionsForMods(args: {
  dayzServerPath: string;
  mods: { workshopId: string; installedPath: string | null }[];
}) {
  // DayZ server generally loads mods from folders like "@CF" in the server directory.
  // We create @<workshopId> junctions to workshop content.
  //
  // NOTE: On Windows, junction creation requires admin permission depending on policy.
  // If this fails, the UI will still let you manage mods, but the server may not load them.
  for (const mod of args.mods) {
    if (!mod.installedPath) continue;
    const linkPath = path.join(args.dayzServerPath, `@${mod.workshopId}`);
    if (fs.existsSync(linkPath)) continue;

    // We attempt to create the junction using a Windows command.
    // This is best-effort and does not crash the server start.
    try {
      await runCmd(["cmd", "/c", "mklink", "/J", linkPath, mod.installedPath]);
    } catch {
      // ignore - non-fatal
    }
  }
}

function runCmd(cmd: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(cmd[0], cmd.slice(1), { windowsHide: true });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed: ${cmd.join(" ")}`));
    });
  });
}
