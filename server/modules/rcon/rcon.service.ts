import { createRequire } from "module";
import { AppError, ErrorCodes } from "../../core/errors";
import { getLogger } from "../../core/logger";
import { getPrisma } from "../../db/prisma";
import { SettingsService } from "../settings/settings.service";

/**
 * We keep the RCON client type as `any` on purpose:
 * - Different npm libraries ship different runtime shapes (CJS/ESM)
 * - We want the panel to stay stable even if the dependency changes
 */
type RconClient = any;

/**
 * RconService
 *
 * IMPORTANT DESIGN CHOICE:
 * - We DO NOT read BattlEye RCON credentials (ip/port/password) from BEServer_x64.cfg.
 *   DayZ/BattlEye may rename that cfg file after the server starts (e.g., BEServer_x64_active_113.cfg)
 *   which makes path-based parsing fragile.
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
   * - If no supported RCON npm library can be loaded -> throws DEPENDENCY_MISSING (500)
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
    const host = (s.rconHost || "127.0.0.1").trim();
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

    // 1) Prefer battle-node-v2 (it is importable on your machine)
    // 2) Fallback to battleye if present
    const adapter = await loadRconAdapter();

    // Create client instance (constructor signatures differ across libs)
    const client = createClient(adapter, { host, port, password });

    // Attach best-effort listeners so UI gets messages (chat, joins, etc.)
    attachListeners(client, {
      onMessage: (line) => pushMessage(line),
      onConnected: () => {
        RconService.connected = true;
        pushMessage("connected");
        this.log.info("RCON connected", { code: "RCON_CONNECTED", context: { host, port } });
      },
      onDisconnected: (reason) => {
        RconService.connected = false;
        pushMessage(`disconnected: ${safeJson(reason)}`);
        this.log.warn("RCON disconnected", { code: "RCON_DISCONNECTED", context: { reason } });
      },
      onError: (err) => {
        RconService.connected = false;
        pushMessage(`error: ${String(err?.message ?? err)}`);
        this.log.warn("RCON error", {
          code: ErrorCodes.RCON_CONNECTION_FAILED,
          context: { message: String(err?.message ?? err) },
        });
      },
    });

    RconService.client = client;
    RconService.connected = false;

    try {
      await connectClient(client, 10000);
      // If the library doesn't emit events, we still consider it connected after connect() succeeds.
      RconService.connected = true;
      pushMessage("connected (no-event)");
      return { ok: true, ...this.status() };
    } catch (err) {
      await this.disconnect();
      throw new AppError({
        code: ErrorCodes.RCON_CONNECTION_FAILED,
        status: 500,
        message: "RCON connection failed",
        cause: err,
        context: { host, port, adapter: adapter.name },
      });
    }
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
      await disconnectClient(client);
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

    pushMessage(`> ${cmd}`);

    try {
      const resp = await sendCommand(RconService.client, cmd);
      pushMessage(typeof resp === "string" ? resp : safeJson(resp));
      return { ok: true, response: resp };
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
  // Keep timestamps in ISO so it is sortable and consistent.
  RconService["lastMessages"].push(`${new Date().toISOString()} ${line}`);
  if (RconService["lastMessages"].length > 500) {
    RconService["lastMessages"] = RconService["lastMessages"].slice(-500);
  }
}

function safeJson(v: unknown) {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

type Adapter = {
  name: "battle-node-v2" | "battleye";
  module: any;
};

async function loadRconAdapter(): Promise<Adapter> {
  const errors: Array<{ name: string; error: unknown }> = [];

  // Prefer battle-node-v2
  try {
    const mod = await loadModule("battle-node-v2");
    return { name: "battle-node-v2", module: mod };
  } catch (e) {
    errors.push({ name: "battle-node-v2", error: e });
  }

  // Fallback to battleye
  try {
    const mod = await loadModule("battleye");
    return { name: "battleye", module: mod };
  } catch (e) {
    errors.push({ name: "battleye", error: e });
  }

  throw new AppError({
    code: ErrorCodes.DEPENDENCY_MISSING,
    status: 500,
    message:
      "No supported BattlEye RCON library could be loaded. Please install 'battle-node-v2' (recommended) or fix your 'battleye' package.",
    context: {
      attempts: errors.map((x) => ({ name: x.name, message: (x.error as any)?.message ?? String(x.error) })),
    },
  });
}

async function loadModule(name: string) {
  try {
    // Some packages ship as CommonJS, some as ESM.
    // Dynamic import handles both in most cases.
    const mod: any = await import(name);
    return mod?.default ?? mod;
  } catch (err) {
    // Fallback to require for weird CJS packages
    const require = createRequire(import.meta.url);
    const mod: any = require(name);
    return mod?.default ?? mod;
  }
}

function createClient(adapter: Adapter, args: { host: string; port: number; password: string }) {
  if (adapter.name === "battle-node-v2") {
    // battle-node-v2 exports: { BattleNode, default }
    const BattleNode = adapter.module?.BattleNode ?? adapter.module?.default ?? adapter.module;

    const candidates: Array<() => any> = [
      () => new BattleNode({ host: args.host, port: args.port, password: args.password }),
      () => new BattleNode({ ip: args.host, port: args.port, password: args.password }),
      () => new BattleNode({ address: args.host, port: args.port, password: args.password }),
      () => new BattleNode(args.host, args.port, args.password),
      () => new BattleNode(args.host, args.port, { password: args.password }),
    ];

    let lastErr: unknown = null;
    for (const make of candidates) {
      try {
        const client = make();
        // Tag for debugging
        client.__adapterName = "battle-node-v2";
        return client;
      } catch (e) {
        lastErr = e;
      }
    }

    throw new AppError({
      code: ErrorCodes.RCON_CONNECTION_FAILED,
      status: 500,
      message: "Failed to construct battle-node-v2 client (constructor mismatch)",
      cause: lastErr,
    });
  }

  // battleye adapter (legacy)
  // NOTE: your current 'battleye' package seems to have a broken entrypoint; this is here only as fallback.
  const battleye = adapter.module;
  const listenPort = 2310;
  const socket = new battleye.Socket({ port: listenPort, ip: "0.0.0.0" });
  const conn = socket.connection(
    {
      name: "dayz-server",
      password: args.password,
      ip: args.host,
      port: args.port,
    },
    {
      reconnect: true,
      keepAlive: true,
      keepAliveInterval: 15000,
      timeout: true,
      serverTimeout: 30000,
    },
  );

  // Provide a single object surface like battle-node-v2
  const wrapper: any = conn;
  wrapper.__adapterName = "battleye";
  wrapper.__battleyeSocket = socket;
  return wrapper;
}

function attachListeners(
  client: any,
  handlers: {
    onMessage: (line: string) => void;
    onConnected: () => void;
    onDisconnected: (reason: any) => void;
    onError: (err: any) => void;
  },
) {
  // battleye: socket emits received/sent; connection emits message/connected/disconnected/error
  const socket = client?.__battleyeSocket;
  if (socket?.on) {
    socket.on("received", (_resolved: any, packet: any) => handlers.onMessage(`received packet: ${safeJson(packet)}`));
    socket.on("sent", (packet: any) => handlers.onMessage(`sent packet: ${safeJson(packet)}`));
    socket.on("error", (err: any) => handlers.onMessage(`socket error: ${String(err?.message ?? err)}`));
  }

  // Generic event emitter
  if (typeof client?.on === "function") {
    // Messages
    client.on("message", (m: any) => handlers.onMessage(String(m)));
    client.on("data", (m: any) => handlers.onMessage(String(m)));

    // Connected-ish events
    client.on("connected", handlers.onConnected);
    client.on("connect", handlers.onConnected);
    client.on("ready", handlers.onConnected);

    // Disconnected-ish events
    client.on("disconnected", handlers.onDisconnected);
    client.on("disconnect", handlers.onDisconnected);
    client.on("close", handlers.onDisconnected);

    // Error-ish events
    client.on("error", handlers.onError);
  }
}

async function connectClient(client: any, timeoutMs: number) {
  // Try common method names.
  const startedAt = Date.now();

  const methodNames = ["connect", "login", "start", "init", "open"]; // ordered by likelihood
  let invoked = false;

  for (const name of methodNames) {
    const fn = client?.[name];
    if (typeof fn !== "function") continue;
    invoked = true;

    // Some libs take (password) or no args. We'll try no-arg first.
    try {
      await Promise.resolve(fn.call(client));
      return;
    } catch (e1) {
      // Second attempt: pass password if available on client (best-effort)
      try {
        await Promise.resolve(fn.call(client, client?.password));
        return;
      } catch {
        // continue
      }
    }
  }

  if (!invoked) {
    // If library has no connect method, we can't do much.
    // Some libs connect on construction; treat as connected.
    return;
  }

  const elapsed = Date.now() - startedAt;
  if (elapsed > timeoutMs) {
    throw new Error("RCON connection timed out");
  }
}

async function disconnectClient(client: any) {
  if (!client) return;

  const methodNames = ["disconnect", "close", "destroy", "stop", "end"];
  for (const name of methodNames) {
    const fn = client?.[name];
    if (typeof fn !== "function") continue;
    await Promise.resolve(fn.call(client));
    break;
  }

  // battleye wrapper socket close
  const socket = client?.__battleyeSocket;
  try {
    socket?.close?.();
  } catch {
    // ignore
  }
}

async function sendCommand(client: any, cmd: string) {
  const methodNames = ["command", "sendCommand", "execute", "run", "send"];
  for (const name of methodNames) {
    const fn = client?.[name];
    if (typeof fn !== "function") continue;

    const resp = await Promise.resolve(fn.call(client, cmd));

    // battleye returns { data: "..." }
    if (resp && typeof resp === "object" && "data" in resp) return (resp as any).data;
    return resp;
  }

  throw new Error("RCON client does not expose a command method");
}
