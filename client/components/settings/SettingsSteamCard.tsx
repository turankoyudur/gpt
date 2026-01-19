import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SettingsField from "@/components/settings/SettingsField";
import type { SettingsModel } from "@/types/settings";
import type { UpdateSettings } from "@/components/settings/types";

type SettingsSteamCardProps = {
  form: SettingsModel;
  onUpdate: UpdateSettings;
};

export default function SettingsSteamCard({
  form,
  onUpdate,
}: SettingsSteamCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Steam (for SteamCMD Workshop Downloads)</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SettingsField
          label="Steam Username"
          value={form.steamUser}
          onChange={(value) => onUpdate("steamUser", value)}
        />
        <SettingsField
          label="Steam Password"
          value={form.steamPassword}
          onChange={(value) => onUpdate("steamPassword", value)}
        />
        <p className="text-xs text-muted-foreground md:col-span-2">
          For security, consider using a dedicated Steam account. In future
          versions we can add encryption/Windows Credential Manager.
        </p>
      </CardContent>
    </Card>
  );
}
