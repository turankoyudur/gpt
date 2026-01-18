import { AppError, ErrorCodes } from "../../core/errors";
import { getPrisma } from "../../db/prisma";
import { SettingsService } from "../settings/settings.service";

// cftools-sdk is ESM-compatible
import { CFToolsClientBuilder, SteamId64 } from "cftools-sdk";

/**
 * CFTools / GameLabs Integration
 *
 * GameLabs is a DayZ server plugin/mod that provides rich events and server telemetry to
 * the CFTools Cloud platform. From the panel, we integrate through the
 * CFTools Cloud Data API (via cftools-sdk), which then exposes many features you see in
 * tools like CFTools Cloud / Omega Manager.
 */
export class CFToolsService {
  private readonly db = getPrisma();
  private readonly settings = new SettingsService(this.db);

  async config() {
    const s = await this.settings.get();
    return {
      configured: !!(s.cftoolsServerApiId && s.cftoolsAppId && s.cftoolsSecret),
      serverApiId: mask(s.cftoolsServerApiId),
      appId: mask(s.cftoolsAppId),
      secret: s.cftoolsSecret ? "***" : "",
      enterprise: !!s.cftoolsEnterpriseKey,
    };
  }

  private async client() {
    const s = await this.settings.get();
    if (!s.cftoolsServerApiId || !s.cftoolsAppId || !s.cftoolsSecret) {
      throw new AppError({
        code: ErrorCodes.SETTINGS_NOT_CONFIGURED,
        status: 400,
        message: "CFTools is not configured. Please fill CFTools ServerApiId / AppId / Secret in Settings.",
      });
    }

    const builder = new CFToolsClientBuilder()
      .withCache()
      .withServerApiId(s.cftoolsServerApiId)
      .withCredentials(s.cftoolsAppId, s.cftoolsSecret);

    if (s.cftoolsEnterpriseKey) {
      builder.withEnterpriseApi(s.cftoolsEnterpriseKey);
    }
    return builder.build();
  }

  /**
   * Example call: query one player's priority queue info.
   *
   * NOTE: This is only one small subset of what the API supports.
   * You can add more endpoints following the same pattern.
   */
  async getPriorityQueue(steamId64: string) {
    try {
      const client = await this.client();
      return await client.getPriorityQueue(SteamId64.of(steamId64));
    } catch (err) {
      throw new AppError({
        code: ErrorCodes.CFTOOLS_REQUEST_FAILED,
        status: 502,
        message: "CFTools request failed",
        cause: err,
        context: { steamId64 },
      });
    }
  }
}

function mask(v?: string) {
  if (!v) return "";
  if (v.length <= 6) return "***";
  return `${v.slice(0, 3)}***${v.slice(-3)}`;
}
