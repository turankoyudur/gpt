import fs from "fs";
import path from "path";
import { z } from "zod";
import { AppError, ErrorCodes } from "../../core/errors";
import type { DbClient } from "../../db/prisma";
import { validateInstanceName } from "../../../shared/instanceName";

/**
 * Settings live in the DB so the user doesn't need to manually edit project files.
 *
 * We keep settings schema-driven so we can validate and evolve safely.
 */
const isWindows = process.platform === "win32";
const windowsRoot = "E:\\steamcmd";
const linuxRoot = "/opt/steamcmd";

const defaultPaths = isWindows
  ? {
      steamcmdPath: path.win32.join(windowsRoot, "steamcmd.exe"),
      dayzServerPath: path.win32.join(windowsRoot, "steamapps", "common", "DayZServer"),
      profilesPath: path.win32.join(windowsRoot, "steamapps", "common", "DayZServer", "profiles"),
      battleyeCfgPath: path.win32.join(
        windowsRoot,
        "steamapps",
        "common",
        "DayZServer",
        "profiles",
        "BattlEye",
        "BEServer_x64.cfg",
      ),
    }
  : {
      steamcmdPath: path.posix.join(linuxRoot, "steamcmd.sh"),
      dayzServerPath: path.posix.join(linuxRoot, "steamapps", "common", "DayZServer"),
      profilesPath: path.posix.join(linuxRoot, "steamapps", "common", "DayZServer", "profiles"),
      battleyeCfgPath: path.posix.join(
        linuxRoot,
        "steamapps",
        "common",
        "DayZServer",
        "profiles",
        "BattlEye",
        "BEServer_x64.cfg",
      ),
    };

export const instanceSettingsSchema = z.object({
  /**
   * Logical instance name.
   *
   * Today we run a single server instance (instance:default in DB).
   * In the next iterations we'll support multiple instances and this name
   * becomes the instance identifier + folder name, so we validate it strictly.
   */
  instanceName: z
    .preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().min(1))
    .refine(
      (value) => validateInstanceName(String(value)).ok,
      (value) => {
        const r = validateInstanceName(String(value));
        return { message: r.ok ? "" : r.message };
      },
    )
    .default("default"),

  // Core paths
  steamcmdPath: z.string().min(1).default(defaultPaths.steamcmdPath),
  dayzServerPath: z.string().min(1).default(defaultPaths.dayzServerPath),
  profilesPath: z.string().min(1).default(defaultPaths.profilesPath),
  battleyeCfgPath: z.string().min(1).default(defaultPaths.battleyeCfgPath),

  // Launch params (stored as key/value and compiled into CLI args)
  serverPort: z.coerce.number().int().positive().default(2302),
  serverConfigFile: z.string().min(1).default("serverDZ.cfg"),
  additionalLaunchArgs: z
    .string()
    .optional()
    .default("dologs -adminlog -netlog -freezecheck"),

  // Steam login (optional; workshop downloads often require an account)
  steamUser: z.string().optional().default(""),
  steamPassword: z.string().optional().default(""),
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
    const candidates =
      process.platform === "win32" ? ["DayZServer_x64.exe"] : ["DayZServer_x64", "DayZServer"];
    for (const candidate of candidates) {
      const exe = path.join(s.dayzServerPath, candidate);
      if (fileExists(exe)) return exe;
    }
    throw new AppError({
      code: ErrorCodes.FILE_NOT_FOUND,
      status: 400,
      message: `DayZ server executable not found. Expected ${candidates.join(" or ")}.`,
      context: { dayzServerPath: s.dayzServerPath },
    });
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
