import fs from "fs";
import path from "path";
import { z } from "zod";
import { AppError, ErrorCodes } from "../../core/errors";
import type { DbClient } from "../../db/prisma";

/**
 * Settings live in the DB so the user doesn't need to manually edit project files.
 *
 * We keep settings schema-driven so we can validate and evolve safely.
 */
export const instanceSettingsSchema = z.object({
  // Core paths
  steamcmdPath: z.string().min(1).default("E:\\steamcmd\\steamcmd.exe"),
  dayzServerPath: z.string().min(1).default("E:\\steamcmd\\steamapps\\common\\DayZServer"),
  profilesPath: z.string().min(1).default("E:\\steamcmd\\steamapps\\common\\DayZServer\\profiles"),
  battleyeCfgPath: z.string().min(1).default(
    "E:\\steamcmd\\steamapps\\common\\DayZServer\\profiles\\BattlEye\\BEServer_x64.cfg",
  ),

  // RCON (BattlEye)
  // NOTE:
  // - Do NOT rely on BEServer_x64.cfg, because DayZ/BattlEye may rename it after the server starts.
  // - These are entered via the Web UI so the panel can connect reliably.
  rconHost: z.string().min(1).default("127.0.0.1"),
  rconPort: z.coerce.number().int().positive().default(2306),
  rconPassword: z.string().optional().default(""),
  rconAutoConnect: z.coerce.boolean().default(true),

  // Launch params (stored as key/value and compiled into CLI args)
  serverPort: z.coerce.number().int().positive().default(2302),
  serverConfigFile: z.string().min(1).default("serverDZ.cfg"),
  additionalLaunchArgs: z.string().optional().default(""),

  // Steam login (optional; workshop downloads often require an account)
  steamUser: z.string().optional().default("") ,
  steamPassword: z.string().optional().default("") ,

  // CFTools Cloud (Data API)
  cftoolsServerApiId: z.string().optional().default(""),
  cftoolsAppId: z.string().optional().default(""),
  cftoolsSecret: z.string().optional().default(""),
  cftoolsEnterpriseKey: z.string().optional().default(""),
});

export type InstanceSettings = z.infer<typeof instanceSettingsSchema>;

const SETTINGS_KEY = "instance:default";

export class SettingsService {
  constructor(private readonly db: DbClient) {}

  /**
   * Reads the settings JSON from the DB and returns a validated settings object.
   */
  async get(): Promise<InstanceSettings> {
    const row = await this.db.setting.findUnique({ where: { key: SETTINGS_KEY } });
    const json = row?.value ? safeJsonParse(row.value) : {};
    return instanceSettingsSchema.parse(json);
  }

  /**
   * Partial update. Unknown keys are rejected by Zod.
   */
  async update(patch: Partial<InstanceSettings>): Promise<InstanceSettings> {
    const current = await this.get();
    const next = instanceSettingsSchema.parse({ ...current, ...patch });

    await this.db.setting.upsert({
      where: { key: SETTINGS_KEY },
      create: { key: SETTINGS_KEY, value: JSON.stringify(next) },
      update: { value: JSON.stringify(next) },
    });

    return next;
  }

  /**
   * Validates that configured paths exist on disk.
   * This is used by the UI "Setup" screen.
   */
  async validatePaths() {
    const s = await this.get();
    const results = {
      steamcmdPath: fileExists(s.steamcmdPath),
      dayzServerPath: dirExists(s.dayzServerPath),
      profilesPath: dirExists(s.profilesPath),
      // Allow either a file path OR a directory (BattlEye may rename cfg files at runtime)
      battleyeCfgPath: fileExists(s.battleyeCfgPath) || dirExists(s.battleyeCfgPath),
    };

    return results;
  }

  /**
   * Returns a derived path to the DayZ server executable.
   */
  async getDayzExecutablePath() {
    const s = await this.get();
    const exe = path.join(s.dayzServerPath, "DayZServer_x64.exe");
    if (!fileExists(exe)) {
      throw new AppError({
        code: ErrorCodes.FILE_NOT_FOUND,
        status: 400,
        message: "DayZServer_x64.exe not found. Check your DayZ server path in Settings.",
        context: { exe },
      });
    }
    return exe;
  }
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function fileExists(p: string) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function dirExists(p: string) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}
