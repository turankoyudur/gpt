import { createRequire } from "module";
import { AppError, ErrorCodes } from "../../core/errors";
import { ConfigService } from "../config/config.service";

// The "battleye" npm package is CommonJS, so we load it via createRequire.
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const battleye = require("battleye") as any;

type BattleyeSocket = any;
type BattleyeConnection = any;

/**
 * RconService
 *
 * Wraps BattlEye RCON so the UI can:
 * - send commands
 * - receive responses
 * - (future) stream server messages live via WebSocket
 */
export class RconService {
  private static socket: BattleyeSocket | null = null;
  private static connection: BattleyeConnection | null = null;
  private static lastMessages: string[] = [];

  private readonly cfg = new ConfigService();

  status() {
    return {
      connected: !!RconService.connection,
      lastMessages: RconService.lastMessages.slice(-200),
    };
  }

  /**
   * Connects using values from BEServer_x64.cfg.
   */
  async connect() {
    if (RconService.connection) return { ok: true, alreadyConnected: true, ...this.status() };

    const parsed = await this.cfg.readBattlEyeCfgParsed();

    const password = parsed.RConPassword;
    const ip = parsed.RConIP ?? "127.0.0.1";
    const portRaw = parsed.RConPort;
    const port = portRaw ? Number(portRaw) : NaN;

    if (!password || !Number.isFinite(port)) {
      throw new AppError({
        code: ErrorCodes.SETTINGS_NOT_CONFIGURED,
        status: 400,
        message: "BattlEye RCON is not configured. Please set RConPassword and RConPort in BEServer_x64.cfg.",
        context: { password: !!password, portRaw },
      });
    }

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

    conn.on("connected", () => pushMessage("connected"));
    conn.on("disconnected", (reason: any) => pushMessage(`disconnected: ${safeJson(reason)}`));
    conn.on("error", (err: any) => pushMessage(`connection error: ${String(err?.message ?? err)}`));

    RconService.socket = socket;
    RconService.connection = conn;

    return { ok: true, ...this.status() };
  }

  async disconnect() {
    const sock = RconService.socket;
    const conn = RconService.connection;
    RconService.connection = null;
    RconService.socket = null;
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

  async command(cmd: string) {
    if (!RconService.connection) {
      await this.connect();
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
}

function pushMessage(line: string) {
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
