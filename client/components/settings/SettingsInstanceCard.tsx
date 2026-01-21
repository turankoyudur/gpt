import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SettingsField from "@/components/settings/SettingsField";
import type { SettingsModel } from "@/types/settings";
import type { UpdateSettings } from "@/components/settings/types";
import { validateInstanceName } from "@shared/instanceName";

type Props = {
  form: SettingsModel;
  onUpdate: UpdateSettings;
};

/**
 * Instance identifier card.
 *
 * This name will be used as an identifier (and later as a folder name) when
 * multiple server instances are supported. To avoid Windows path issues, we
 * restrict it to a safe allowlist.
 */
export default function SettingsInstanceCard({ form, onUpdate }: Props) {
  const validation = validateInstanceName(form.instanceName ?? "");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Server Instance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <SettingsField
          label="Instance name (letters/numbers/_/-)"
          value={form.instanceName}
          onChange={(value) => onUpdate("instanceName", value)}
        />
        {!validation.ok ? (
          <p className="text-xs text-destructive">{validation.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            OK. This will be used as an identifier for the server instance.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
