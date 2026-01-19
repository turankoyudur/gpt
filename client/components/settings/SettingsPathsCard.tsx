import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SettingsField from "@/components/settings/SettingsField";
import type { SettingsModel } from "@/types/settings";
import type { UpdateSettings } from "@/components/settings/types";

type SettingsPathsCardProps = {
  form: SettingsModel;
  onUpdate: UpdateSettings;
};

export default function SettingsPathsCard({
  form,
  onUpdate,
}: SettingsPathsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Paths (Windows/Linux)</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SettingsField
          label="SteamCMD Path"
          value={form.steamcmdPath}
          onChange={(value) => onUpdate("steamcmdPath", value)}
        />
        <SettingsField
          label="DayZ Server Path"
          value={form.dayzServerPath}
          onChange={(value) => onUpdate("dayzServerPath", value)}
        />
        <SettingsField
          label="Profiles Path"
          value={form.profilesPath}
          onChange={(value) => onUpdate("profilesPath", value)}
        />
        <SettingsField
          label="BattlEye CFG Path (file or folder)"
          value={form.battleyeCfgPath}
          onChange={(value) => onUpdate("battleyeCfgPath", value)}
        />
      </CardContent>
    </Card>
  );
}
