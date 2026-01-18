/**
 * A stable error code catalog.
 *
 * IMPORTANT:
 * - Keep codes stable. These are persisted in DB + logs.
 * - Prefix with a logical module name.
 */
export const ErrorCodes = {
  // General
  UNKNOWN: "E_UNKNOWN",
  VALIDATION: "E_VALIDATION",

  // Settings / config
  SETTINGS_NOT_CONFIGURED: "E_SETTINGS_NOT_CONFIGURED",

  // File IO
  FILE_NOT_FOUND: "E_FILE_NOT_FOUND",
  FILE_IO: "E_FILE_IO",

  // SteamCMD
  STEAMCMD_NOT_FOUND: "E_STEAMCMD_NOT_FOUND",
  STEAMCMD_FAILED: "E_STEAMCMD_FAILED",

  // Mods
  MOD_INSTALL_FAILED: "E_MOD_INSTALL_FAILED",
  MOD_REMOVE_FAILED: "E_MOD_REMOVE_FAILED",

  // RCON
  RCON_CONNECTION_FAILED: "E_RCON_CONNECTION_FAILED",
  RCON_COMMAND_FAILED: "E_RCON_COMMAND_FAILED",

  // Game server process
  SERVER_PROCESS_START_FAILED: "E_SERVER_PROCESS_START_FAILED",
  SERVER_PROCESS_STOP_FAILED: "E_SERVER_PROCESS_STOP_FAILED",

  // CFTools / GameLabs
  CFTOOLS_REQUEST_FAILED: "E_CFTOOLS_REQUEST_FAILED",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Custom error that carries a stable error code + HTTP status.
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly context?: Record<string, unknown>;

  constructor(args: {
    code: ErrorCode;
    message: string;
    status?: number;
    cause?: unknown;
    context?: Record<string, unknown>;
  }) {
    super(args.message);
    this.code = args.code;
    this.status = args.status ?? 500;
    this.context = args.context;

    // Preserve original cause for debugging (Node 16+)
    if (args.cause) {
      // @ts-expect-error - TS doesn't know about Error.cause in some configs
      this.cause = args.cause;
    }
  }
}

/**
 * A type guard to detect AppError.
 */
export function isAppError(err: unknown): err is AppError {
  return !!err && typeof err === "object" && "code" in err && "status" in err;
}
