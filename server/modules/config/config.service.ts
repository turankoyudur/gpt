import fs from "fs";
import path from "path";
import { AppError, ErrorCodes } from "../../core/errors";
import { SettingsService } from "../settings/settings.service";
import { getPrisma } from "../../db/prisma";

/**
 * ConfigService handles editing DayZ server text configs through the Web UI.
 *
 * This sprint:
 * - server config file (default: serverDZ.cfg)
 *
 * Why:
 * - You asked to avoid manual edits in project files.
 * - DayZ uses plain-text configs; we expose a safe "raw editor" for them.
 */
export class ConfigService {
  private readonly settings = new SettingsService(getPrisma());

  private ensureFileExists(filePath: string) {
    if (!fs.existsSync(filePath)) {
      throw new AppError(ErrorCodes.CONFIG_FILE_NOT_FOUND, `Config file not found: ${filePath}`, { filePath });
    }
  }

  private async getServerCfgPath() {
    const s = await this.settings.get();
    const cfgPath = path.join(s.dayzServerPath, s.serverConfigFile);
    return { s, cfgPath };
  }

  async readServerCfgRaw(): Promise<string> {
    const { cfgPath } = await this.getServerCfgPath();
    this.ensureFileExists(cfgPath);
    return fs.readFileSync(cfgPath, "utf-8");
  }

  async writeServerCfgRaw(contents: string) {
    const { cfgPath } = await this.getServerCfgPath();
    fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
    fs.writeFileSync(cfgPath, contents, "utf-8");
    return { ok: true };
  }

  async listEditableFiles() {
    const { s, cfgPath } = await this.getServerCfgPath();

    return [
      {
        key: "serverCfg",
        label: `Server Config (${s.serverConfigFile})`,
        path: cfgPath,
      },
    ];
  }
}
