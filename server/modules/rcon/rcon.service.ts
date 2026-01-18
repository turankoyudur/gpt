import { createRequire } from "module";
import path from "path";
import { AppError, ErrorCodes } from "../../core/errors";
import { getLogger } from "../../core/logger";
import { getPrisma } from "../../db/prisma";
import { SettingsService } from "../settings/settings.service";

type RconClient = {
  on?: (event: string, handler: (...args: any[]) => void) => void;
  once?: (event: string, handler: (...args: any[]) => void) => void;
  off?: (event: string, handler: (...args: any[]) => void) => void;
  connect?: () => Promise<void> | void;
  disconnect?: () => void;
  close?: () => void;
  command?: (cmd: string) => Promise<any>;
  send?: (cmd: string) => Promise<any>;
};

/**
 * RconService
 *
 * IMPORTANT DESIGN CHOICE:
 * - We DO NOT read BattlEye RCON credentials (ip/port/password) from BEServer_x64.cfg.
 *   DayZ/BattlEye may rename that cfg file after the server starts (e.g., BEServer_x64_active_113.cfg).
 * - Instead, credentials are stored in DB Settings and entered via Web UI.
 */
export class RconService {
  private static client: RconClient | null = null;
  private static connected = false;
  private static lastMessages: string[] = [];

  private readonly db = getPrisma();
  private readonly settings = new SettingsService(this.db);
  private readonly log = getLogger();

  status() {
    return {
      connected: RconService.connected,
      lastMessages: RconService.lastMessages.slice(-200),
    };
  }

  /**
   * Connects using RCON settings from the DB.
   *
   * Safe behavior:
   * - If credentials are missing -> throws SETTINGS_NOT_CONFIGURED (400)
   * - If the battle-node-v2 npm package cannot be loaded -> throws DEPENDENCY_MISSING (500)
   * - Never crashes the whole app; errors are wrapped as AppError with stable error codes.
   */
  async connect() {
    if (RconService.client && RconService.connected) {
      return { ok: true, alreadyConnected: true, ...this.status() };
    }
    if (RconService.client && !RconService.connected) {
      await this.disconnect();
    }

    const s = await this.settings.get();
    const ip = (s.rconHost || "127.0.0.1").trim();
    const port = Number(s.rconPort);
    const password = (s.rconPassword || "").trim();

    if (!password || !Number.isFinite(port) || port <= 0) {
      throw new AppError({
        code: ErrorCodes.SETTINGS_NOT_CONFIGURED,
        status: 400,
        message: "RCON is not configured. Please set RCON host/port/password in Settings.",
        context: { hasPassword: !!password, port },
      });
    }

    const battleNode = await loadBattleye();
    const client = createBattleNodeClient(battleNode, { ip, port, password });

    client.on?.("message", (message: string) => {
      // Server messages (chat, joins, etc.) show up here.
      pushMessage(message);
    });

    client.on?.("connected", () => {
      RconService.connected = true;
      pushMessage("connected");
      this.log.info("RCON connected", { code: "RCON_CONNECTED", context: { ip, port } });
    });
    client.on?.("disconnected", (reason: any) => {
      RconService.connected = false;
      pushMessage(`disconnected: ${safeJson(reason)}`);
      this.log.warn("RCON disconnected", { code: "RCON_DISCONNECTED", context: { reason } });
    });
    client.on?.("error", (err: any) => {
      RconService.connected = false;
      pushMessage(`connection error: ${String(err?.message ?? err)}`);
      this.log.warn("RCON connection error", {
        code: ErrorCodes.RCON_CONNECTION_FAILED,
        context: { message: String(err?.message ?? err) },
      });
    });

    RconService.client = client;
    RconService.connected = false;

    try {
      if (client.connect) {
        await client.connect();
      }
      if (!client.once && !client.on) {
        RconService.connected = true;
      } else {
        await waitForConnection(client);
      }
    } catch (err) {
      await this.disconnect();
      throw new AppError({
        code: ErrorCodes.RCON_CONNECTION_FAILED,
        status: 500,
        message: "RCON connection failed",
        cause: err,
        context: { ip, port },
      });
    }

    return { ok: true, ...this.status() };
  }

  /**
   * Best-effort disconnect.
   * This should never throw; the panel should keep running even if the adapter behaves weirdly.
   */
  async disconnect() {
    const client = RconService.client;
    RconService.client = null;
    RconService.connected = false;

    try {
      client?.disconnect?.();
    } catch {
      // ignore
    }
    try {
      client?.close?.();
    } catch {
      // ignore
    }
    return { ok: true };
  }

  /**
   * Sends a command. If not connected, tries to connect first.
   */
  async command(cmd: string) {
    if (!RconService.client || !RconService.connected) {
      await this.connect();
    }
    if (!RconService.client || !RconService.connected) {
      throw new AppError({
        code: ErrorCodes.RCON_NOT_CONNECTED,
        status: 400,
        message: "RCON is not connected",
      });
    }

    try {
      const client = RconService.client;
      if (!client?.command && !client?.send) {
        throw new AppError({
          code: ErrorCodes.DEPENDENCY_MISSING,
          status: 500,
          message: "BattlEye RCON client does not support command execution.",
        });
      }
      const resp = await (client?.command?.(cmd) ?? client?.send?.(cmd));
      pushMessage(`> ${cmd}`);
      pushMessage(resp?.data ?? safeJson(resp));
      return { ok: true, response: resp?.data ?? resp };
    } catch (err) {
      throw new AppError({
        code: ErrorCodes.RCON_COMMAND_FAILED,
        status: 500,
        message: "RCON command failed",
        cause: err,
        context: { cmd },
      });
    }
  }

  /**
   * Auto-connect helper:
   * - Used by ServerControlService after the game server is started.
   * - Will not throw if settings are missing; it simply returns ok:false.
   */
  async autoConnectIfEnabled() {
    const s = await this.settings.get();
    if (!s.rconAutoConnect) return { ok: false, skipped: true, reason: "disabled" };
    if (!s.rconPassword || !s.rconPort) return { ok: false, skipped: true, reason: "not_configured" };
    try {
      return await this.connect();
    } catch (err) {
      // Do not crash the caller (this runs in background timers)
      this.log.warn("RCON auto-connect failed", {
        code: ErrorCodes.RCON_CONNECTION_FAILED,
        context: { message: (err as any)?.message ?? String(err) },
      });
      return { ok: false, error: (err as any)?.message ?? String(err) };
    }
  }
}

function pushMessage(line: string) {
  // We keep timestamps in ISO so it is sortable and consistent.
  RconService.lastMessages.push(`${new Date().toISOString()} ${line}`);
  if (RconService.lastMessages.length > 500) {
    RconService.lastMessages = RconService.lastMessages.slice(-500);
  }
}

function safeJson(v: unknown) {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

async function loadBattleye() {
  try {
    // Some environments ship battle-node-v2 as CommonJS, some as ESM.
    // Dynamic import handles both.
    const mod: any = await import("battle-node-v2");
    return mod?.default ?? mod;
  } catch (err) {
    try {
      const require = createRequire(import.meta.url);
      const mod: any = require("battle-node-v2");
      return mod?.default ?? mod;
    } catch (err2) {
      try {
        const require = createRequire(path.join(process.cwd(), "package.json"));
        const mod: any = require("battle-node-v2");
        return mod?.default ?? mod;
      } catch (err3) {
        throw new AppError({
          code: ErrorCodes.DEPENDENCY_MISSING,
          status: 500,
          message:
            "BattlEye RCON library could not be loaded (npm package: battle-node-v2). Reinstall dependencies or switch to a supported RCON library.",
          cause: err3 ?? err2 ?? err,
          context: {
            cwd: process.cwd(),
            importError: err instanceof Error ? err.message : String(err),
            requireError: err2 instanceof Error ? err2.message : String(err2),
            cwdRequireError: err3 instanceof Error ? err3.message : String(err3),
          },
        });
      }
    }
  }
}

function createBattleNodeClient(mod: any, opts: { ip: string; port: number; password: string }): RconClient {
  const Candidate =
    mod?.BattleNode ??
    mod?.BattleNodeClient ??
    mod?.Rcon ??
    mod?.default ??
    mod;
  if (typeof Candidate === "function") {
    return new Candidate(opts);
  }
  if (Candidate?.Client && typeof Candidate.Client === "function") {
    return new Candidate.Client(opts);
  }
  throw new Error("Unsupported battle-node-v2 export");
}

async function waitForConnection(conn: RconClient, timeoutMs = 10000) {
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("RCON connection timed out"));
    }, timeoutMs);

    const addListener = conn.once ?? conn.on;
    if (!addListener) {
      clearTimeout(timeout);
      resolve();
      return;
    }

    const onConnected = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const onError = (err: any) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err ?? new Error("RCON connection error"));
    };
    const onDisconnected = (reason: any) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(`RCON disconnected: ${safeJson(reason)}`));
    };

    const cleanup = () => {
      clearTimeout(timeout);
      conn.off?.("connected", onConnected);
      conn.off?.("error", onError);
      conn.off?.("disconnected", onDisconnected);
    };

    addListener.call(conn, "connected", onConnected);
    addListener.call(conn, "error", onError);
    addListener.call(conn, "disconnected", onDisconnected);
  });
}
