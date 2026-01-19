import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SettingsField from "@/components/settings/SettingsField";
import type { SettingsModel } from "@/types/settings";
import type { UpdateSettings } from "@/components/settings/types";

type SettingsCftoolsCardProps = {
  form: SettingsModel;
  onUpdate: UpdateSettings;
};

export default function SettingsCftoolsCard({
  form,
  onUpdate,
}: SettingsCftoolsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>CFTools / GameLabs</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SettingsField
          label="Server API ID"
          value={form.cftoolsServerApiId}
          onChange={(value) => onUpdate("cftoolsServerApiId", value)}
        />
        <SettingsField
          label="Application ID"
          value={form.cftoolsAppId}
          onChange={(value) => onUpdate("cftoolsAppId", value)}
        />
        <SettingsField
          label="Secret"
          value={form.cftoolsSecret}
          onChange={(value) => onUpdate("cftoolsSecret", value)}
        />
        <SettingsField
          label="Enterprise Key (optional)"
          value={form.cftoolsEnterpriseKey}
          onChange={(value) => onUpdate("cftoolsEnterpriseKey", value)}
        />
      </CardContent>
    </Card>
  );
}
