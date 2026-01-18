import fs from "fs";
import path from "path";
import { AppError, ErrorCodes } from "../../core/errors";
import { SettingsService } from "../settings/settings.service";
import { getPrisma } from "../../db/prisma";

/**
 * ConfigService deals with editing DayZ related files.
 *
 * For the first iteration we focus on:
 * - BEServer_x64.cfg (BattlEye RCON config)
 *
 * Later you can extend this module to manage:
 * - serverDZ.cfg
 * - mission / economy configs
 * - profiles
 */
export class ConfigService {
  private readonly settings = new SettingsService(getPrisma());

  /**
   * Reads the raw contents of the BattlEye config file.
   */
  async readBattlEyeCfgRaw(): Promise<string> {
    const s = await this.settings.get();
    return readTextFile(s.battleyeCfgPath);
  }

  /**
   * Writes raw text to the BattlEye config file.
   *
   * NOTE: We keep this as a raw editor because servers often contain custom comments.
   */
  async writeBattlEyeCfgRaw(contents: string) {
    const s = await this.settings.get();
    writeTextFile(s.battleyeCfgPath, contents);
    return { ok: true };
  }

  /**
   * Parses BattlEye config into a key/value object.
   *
   * Example lines:
   * - RConPassword mypassword
   * - RConPort 2306
   */
  async readBattlEyeCfgParsed() {
    const raw = await this.readBattlEyeCfgRaw();
    return parseSimpleCfg(raw);
  }

  /**
   * Updates specific keys inside BEServer_x64.cfg.
   *
   * This tries to preserve unknown lines and comments.
   */
  async updateBattlEyeCfg(patch: Record<string, string>) {
    const s = await this.settings.get();
    const raw = readTextFile(s.battleyeCfgPath);
    const next = mergeSimpleCfg(raw, patch);
    writeTextFile(s.battleyeCfgPath, next);
    return parseSimpleCfg(next);
  }

  /**
   * Returns a list of "safe" known config files we expose in the UI.
   */
  async listKnownConfigFiles() {
    const s = await this.settings.get();

    // serverDZ.cfg is normally inside the DayZ server folder
    const serverCfgPath = path.join(s.dayzServerPath, s.serverConfigFile);

    return {
      files: [
        { key: "dayz", label: "DayZ server folder", path: s.dayzServerPath },
        { key: "profiles", label: "Profiles folder", path: s.profilesPath },
        {
          key: "battleye",
          label: "BattlEye (BEServer_x64.cfg)",
          path: s.battleyeCfgPath,
        },
        { key: "servercfg", label: "Server config (serverDZ.cfg)", path: serverCfgPath },
      ],
    };
  }
}

function readTextFile(p: string) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch (err) {
    throw new AppError({
      code: ErrorCodes.FILE_IO,
      status: 500,
      message: `Failed to read file: ${p}`,
      cause: err,
      context: { path: p },
    });
  }
}

function writeTextFile(p: string, contents: string) {
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, contents, "utf8");
  } catch (err) {
    throw new AppError({
      code: ErrorCodes.FILE_IO,
      status: 500,
      message: `Failed to write file: ${p}`,
      cause: err,
      context: { path: p },
    });
  }
}

function parseSimpleCfg(contents: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) continue;
    const [key, ...rest] = trimmed.split(/\s+/);
    if (!key) continue;
    map[key] = rest.join(" ");
  }
  return map;
}

function mergeSimpleCfg(original: string, patch: Record<string, string>) {
  const lines = original.split(/\r?\n/);
  const seen = new Set<string>();

  const nextLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) return line;
    const [key] = trimmed.split(/\s+/);
    if (!key) return line;
    if (patch[key] === undefined) return line;
    seen.add(key);
    // Preserve leading whitespace
    const prefix = line.match(/^\s*/)?.[0] ?? "";
    return `${prefix}${key} ${patch[key]}`;
  });

  // Append new keys not present in file
  for (const [key, value] of Object.entries(patch)) {
    if (!seen.has(key)) {
      nextLines.push(`${key} ${value}`);
    }
  }

  return nextLines.join("\r\n");
}
