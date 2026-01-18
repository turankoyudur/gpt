import { createRequire } from "module";
import { AppError, ErrorCodes } from "../../core/errors";
import { ConfigService } from "../config/config.service";

// createRequire güvenli; ama "battleye" yüklemeyi connect anına erteliyoruz.
const require = createRequire(import.meta.url);

function loadBattleye() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("battleye") as any;
  } catch (err) {
    // Panel çalışsın; sadece RCON kullanılırken bu hata dönsün
    throw new AppError({
      code: ErrorCodes.DEPENDENCY_MISSING,
      status: 500,
      message:
        "BattlEye RCON library could not be loaded (npm package: battleye). Reinstall dependencies or switch to a supported RCON package.",
      cause: err,
    });
  }
}

type BattleyeSocket = any;
type BattleyeConnection = any;

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

  async connect() {
    if (RconService.connection) return { ok: true, alreadyConnected: true, ...this.status() };

    // ✅ battleye burada yükleniyor (lazy)
    const battleye = loadBattleye();

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

    const listenPort = 2310;
    const socket = new battleye.Socket({ port: listenPort, ip: "0.0.0.0" });

    const conn = socket.connection(
      { name: "dayz-server", password, ip, port },
      { reconnect: true, keepAlive: true, keepAliveInterval: 15000, timeout: true, serverTimeout: 30000 },
    );

    socket.on("received", (_resolved: any, packet: any) => pushMessage(`received packet: ${safeJson(packet)}`));
    socket.on("sent", (packet: any) => pushMessage(`sent packet: ${safeJson(packet)}`));
    socket.on("error", (err: any) => pushMessage(`socket error: ${String(err?.message ?? err)}`));

    conn.on("message", (message: string) => pushMessage(message));
    conn.on("connected", () => pushMessage("connected"));
    conn.on("disconnected", (reason: any) => pushMessage(`disconnected: ${safeJson(reason)}`));
    conn.on("error", (err: any) => pushMessage(`connection error: ${String(err?.message ?? err)}`));

    RconService.socket = socket;
    RconService.connection = conn;

    return { ok: true, ...this.status() };
  }

  async disconnect() {
    if (!RconService.connection) {
      return { ok: true, alreadyDisconnected: true, ...this.status() };
    }

    try {
      const connection = RconService.connection as { disconnect?: () => Promise<void> | void; kill?: (err?: Error) => void };

      if (typeof connection.disconnect === "function") {
        await connection.disconnect();
      } else if (typeof connection.kill === "function") {
        connection.kill();
      }

      RconService.connection = null;
      RconService.socket = null;

      return { ok: true, ...this.status() };
    } catch (err) {
      throw new AppError({
        code: ErrorCodes.RCON_CONNECTION_FAILED,
        status: 500,
        message: "Failed to disconnect from BattlEye RCON.",
        cause: err,
      });
    }
  }

  async command(cmd: string) {
    if (!RconService.connection) {
      throw new AppError({
        code: ErrorCodes.RCON_CONNECTION_FAILED,
        status: 400,
        message: "BattlEye RCON is not connected.",
      });
    }

    const connection = RconService.connection as { command?: (input: string) => Promise<unknown> };
    if (typeof connection.command !== "function") {
      throw new AppError({
        code: ErrorCodes.RCON_COMMAND_FAILED,
        status: 500,
        message: "RCON connection does not support command dispatch.",
      });
    }

    try {
      pushMessage(`command: ${cmd}`);
      const response = await connection.command(cmd);
      if (response) {
        pushMessage(`response: ${safeJson(response)}`);
      }
      return { ok: true, response };
    } catch (err) {
      throw new AppError({
        code: ErrorCodes.RCON_COMMAND_FAILED,
        status: 500,
        message: "Failed to send RCON command.",
        cause: err,
        context: { cmd },
      });
    }
  }
}

function pushMessage(line: string) {
  RconService.lastMessages.push(`${new Date().toISOString()} ${line}`);
  if (RconService.lastMessages.length > 500) RconService.lastMessages = RconService.lastMessages.slice(-500);
}

function safeJson(v: unknown) {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
