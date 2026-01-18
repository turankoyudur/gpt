import fs from "fs";
import path from "path";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { AppError, ErrorCodes } from "../../core/errors";
import { getPrisma } from "../../db/prisma";
import { SettingsService } from "../settings/settings.service";

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

    return { ok: true, args, ...(await this.status()) };
  }

  /**
   * Stops the process.
   *
   * NOTE: This is a simple kill for now.
   * Future improvement:
   * - send "#shutdown" via RCON (BattlEye)
   * - wait N seconds
   * - then kill if needed
   */
  async stop() {
    const proc = ServerControlService.proc;
    if (!proc) return { ok: true, alreadyStopped: true };

    try {
      proc.kill();
      return { ok: true };
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
