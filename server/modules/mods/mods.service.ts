import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import axios from "axios";
import { AppError, ErrorCodes } from "../../core/errors";
import { SettingsService } from "../settings/settings.service";
import { getPrisma } from "../../db/prisma";

/**
 * ModsService
 *
 * Responsibilities:
 * - Keep a local catalog of mods (DB)
 * - Fetch metadata from Steam Workshop (title, size, updated timestamp)
 * - Install mods using SteamCMD
 * - Enable/disable mods (affects server launch -mod=... argument)
 */
export class ModsService {
  private readonly db = getPrisma();
  private readonly settings = new SettingsService(this.db);

  /**
   * Lists mods from the DB.
   */
  async list() {
    return this.db.mod.findMany({ orderBy: { enabled: "desc" } });
  }

  /**
   * Adds a workshop ID to the catalog.
   *
   * This does NOT install it yet (install is a separate action).
   */
  async add(workshopId: string) {
    const meta = await fetchWorkshopDetails(workshopId);
    return this.db.mod.upsert({
      where: { workshopId },
      create: {
        workshopId,
        name: meta?.name,
        description: meta?.description,
        sizeBytes: meta?.sizeBytes,
        lastUpdateTs: meta?.lastUpdateTs,
        enabled: false,
      },
      update: {
        name: meta?.name,
        description: meta?.description,
        sizeBytes: meta?.sizeBytes,
        lastUpdateTs: meta?.lastUpdateTs,
      },
    });
  }

  /**
   * Installs the given Workshop mod via SteamCMD.
   *
   * IMPORTANT:
   * - DayZ workshop downloads usually require a Steam account that owns DayZ.
   * - For safety, we take credentials from Settings (UI), not from code files.
   */
  async install(workshopId: string) {
    const s = await this.settings.get();

    // Quick checks
    if (!fs.existsSync(s.steamcmdPath)) {
      throw new AppError({
        code: ErrorCodes.STEAMCMD_NOT_FOUND,
        status: 400,
        message: "steamcmd.exe not found. Please set SteamCMD path in Settings.",
        context: { steamcmdPath: s.steamcmdPath },
      });
    }

    // Workshop content path is usually: <steamapps>/workshop/content/221100/<id>
    const steamappsDir = path.resolve(s.dayzServerPath, "..", "..");
    const workshopDir = path.join(steamappsDir, "workshop", "content", "221100", workshopId);

    // Compose SteamCMD command
    const login = s.steamUser && s.steamPassword ? [s.steamUser, s.steamPassword] : ["anonymous"];

    const args = [
      "+force_install_dir",
      s.dayzServerPath,
      "+login",
      ...login,
      "+workshop_download_item",
      "221100",
      workshopId,
      "validate",
      "+quit",
    ];

    const result = await runProcess(s.steamcmdPath, args);

    if (result.exitCode !== 0) {
      throw new AppError({
        code: ErrorCodes.STEAMCMD_FAILED,
        status: 500,
        message: "SteamCMD failed while downloading the mod",
        context: { workshopId, exitCode: result.exitCode, stdout: result.stdout.slice(-2000) },
      });
    }

    // Best-effort update installedPath
    const installedPath = fs.existsSync(workshopDir) ? workshopDir : undefined;

    await this.db.mod.update({
      where: { workshopId },
      data: { installedPath },
    });

    return { ok: true, installedPath, output: result.stdout };
  }

  /**
   * Enables/disables a mod.
   * This only affects launch arguments; it does not delete files.
   */
  async setEnabled(workshopId: string, enabled: boolean) {
    const mod = await this.db.mod.update({
      where: { workshopId },
      data: { enabled },
    });
    return mod;
  }

  /**
   * Scans the workshop directory to detect mods that exist on disk.
   * This is used to reconcile manual downloads / updates.
   */
  async scanInstalledOnDisk() {
    const s = await this.settings.get();
    const steamappsDir = path.resolve(s.dayzServerPath, "..", "..");
    const base = path.join(steamappsDir, "workshop", "content", "221100");
    if (!fs.existsSync(base)) return { base, found: [] as string[] };
    const found = fs
      .readdirSync(base, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    return { base, found };
  }
}

/**
 * Fetches Steam Workshop details.
 *
 * This endpoint is widely used by community tools and doesn't require auth.
 * If Valve changes it or rate limits you, you'll still be able to manage mods by ID.
 */
async function fetchWorkshopDetails(workshopId: string) {
  try {
    const params = new URLSearchParams();
    params.set("itemcount", "1");
    params.set("publishedfileids[0]", workshopId);

    const resp = await axios.post(
      "https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/",
      params,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );

    const details = resp.data?.response?.publishedfiledetails?.[0];
    if (!details || details.result !== 1) return null;
    return {
      name: details.title as string,
      description: (details.description as string) ?? undefined,
      sizeBytes: typeof details.file_size === "number" ? details.file_size : undefined,
      lastUpdateTs: typeof details.time_updated === "number" ? details.time_updated : undefined,
    };
  } catch {
    return null;
  }
}

function runProcess(command: string, args: string[]) {
  return new Promise<{ exitCode: number; stdout: string }>((resolve) => {
    const child = spawn(command, args, {
      windowsHide: true,
    });
    let stdout = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stdout += d.toString()));
    child.on("close", (code) => {
      resolve({ exitCode: code ?? 0, stdout });
    });
  });
}
