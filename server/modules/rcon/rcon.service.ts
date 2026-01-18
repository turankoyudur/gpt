import { AppError, ErrorCodes } from "../../core/errors";
import { getLogger } from "../../core/logger";
import { getPrisma } from "../../db/prisma";
import { SettingsService } from "../settings/settings.service";

type BattleyeSocket = any;
type BattleyeConnection = any;

/**
 * RconService
 *
 * IMPORTANT DESIGN CHOICE:
 * - We DO NOT read BattlEye RCON credentials (ip/port/password) from BEServer_x64.cfg.
 *   DayZ/BattlEye may rename that cfg file after the server starts (e.g., BEServer_x64_active_113.cfg).
 * - Instead, credentials are stored in DB Settings and entered via Web UI.
 */
export class RconService {
  private static socket: BattleyeSocket | null = null;
  private static connection: BattleyeConnection | null = null;
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
   * - If the battleye npm package cannot be loaded -> throws DEPENDENCY_MISSING (500)
   * - Never crashes the whole app; errors are wrapped as AppError with stable error codes.
   */
  async connect() {
    if (RconService.connection && RconService.connected) {
      return { ok: true, alreadyConnected: true, ...this.status() };
    }
    if (RconService.connection && !RconService.connected) {
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

    const battleye = await loadBattleye();

    // Client-side socket port. If you run multiple connections later, make this configurable.
    const listenPort = 2310;
    const socket = new battleye.Socket({ port: listenPort, ip: "0.0.0.0" });

    // Create connection with keepalive and reconnect enabled.
    const conn = socket.connection(
      {
        name: "dayz-server",
        password,
        ip,
        port,
      },
      {
        reconnect: true,
        keepAlive: true,
        keepAliveInterval: 15000,
        timeout: true,
        serverTimeout: 30000,
      },
    );

    socket.on("received", (_resolved: any, packet: any) => {
      pushMessage(`received packet: ${safeJson(packet)}`);
    });
    socket.on("sent", (packet: any) => {
      pushMessage(`sent packet: ${safeJson(packet)}`);
    });
    socket.on("error", (err: any) => {
      pushMessage(`socket error: ${String(err?.message ?? err)}`);
    });

    conn.on("message", (message: string) => {
      // Server messages (chat, joins, etc.) show up here.
      pushMessage(message);
    });

    conn.on("connected", () => {
      RconService.connected = true;
      pushMessage("connected");
      this.log.info("RCON connected", { code: "RCON_CONNECTED", context: { ip, port } });
    });
    conn.on("disconnected", (reason: any) => {
      RconService.connected = false;
      pushMessage(`disconnected: ${safeJson(reason)}`);
      this.log.warn("RCON disconnected", { code: "RCON_DISCONNECTED", context: { reason } });
    });
    conn.on("error", (err: any) => {
      RconService.connected = false;
      pushMessage(`connection error: ${String(err?.message ?? err)}`);
      this.log.warn("RCON connection error", {
        code: ErrorCodes.RCON_CONNECTION_FAILED,
        context: { message: String(err?.message ?? err) },
      });
    });

    RconService.socket = socket;
    RconService.connection = conn;
    RconService.connected = false;

    try {
      await waitForConnection(conn);
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
    const sock = RconService.socket;
    const conn = RconService.connection;
    RconService.connection = null;
    RconService.socket = null;
    RconService.connected = false;

    try {
      conn?.disconnect?.();
    } catch {
      // ignore
    }
    try {
      sock?.close?.();
    } catch {
      // ignore
    }
    return { ok: true };
  }

  /**
   * Sends a command. If not connected, tries to connect first.
   */
  async command(cmd: string) {
    if (!RconService.connection || !RconService.connected) {
      await this.connect();
    }
    if (!RconService.connection || !RconService.connected) {
      throw new AppError({
        code: ErrorCodes.RCON_NOT_CONNECTED,
        status: 400,
        message: "RCON is not connected",
      });
    }

    try {
      const resp = await RconService.connection.command(cmd);
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
    // Some environments ship battleye as CommonJS, some as ESM.
    // Dynamic import handles both.
    const mod: any = await import("battleye");
    return mod?.default ?? mod;
  } catch (err) {
    throw new AppError({
      code: ErrorCodes.DEPENDENCY_MISSING,
      status: 500,
      message:
        "BattlEye RCON library could not be loaded (npm package: battleye). Reinstall dependencies or switch to a supported RCON library.",
      cause: err,
    });
  }
}

async function waitForConnection(conn: BattleyeConnection, timeoutMs = 10000) {
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("RCON connection timed out"));
    }, timeoutMs);

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

    conn.once?.("connected", onConnected);
    conn.once?.("error", onError);
    conn.once?.("disconnected", onDisconnected);
  });
}
