import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SettingsField from "@/components/settings/SettingsField";
import type { SettingsModel } from "@/types/settings";
import type { UpdateSettings } from "@/components/settings/types";

type SettingsRconCardProps = {
  form: SettingsModel;
  onUpdate: UpdateSettings;
};

export default function SettingsRconCard({
  form,
  onUpdate,
}: SettingsRconCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>RCON (BattlEye)</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SettingsField
          label="RCON Host"
          value={form.rconHost}
          onChange={(value) => onUpdate("rconHost", value)}
        />
        <SettingsField
          label="RCON Port"
          value={String(form.rconPort)}
          onChange={(value) => onUpdate("rconPort", Number(value))}
        />
        <div className="space-y-2 md:col-span-2">
          <Label>RCON Password</Label>
          <Input
            type="password"
            value={form.rconPassword}
            onChange={(event) =>
              onUpdate("rconPassword", event.target.value)
            }
            placeholder="Enter BattlEye RCON password"
          />
          <p className="text-xs text-muted-foreground">
            We don't read the password from BEServer_x64.cfg because that file
            name may change after the server starts.
          </p>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Auto-connect RCON when server starts</Label>
          <Input
            value={form.rconAutoConnect ? "true" : "false"}
            onChange={(event) =>
              onUpdate("rconAutoConnect", event.target.value === "true")
            }
            placeholder="true/false"
          />
          <p className="text-xs text-muted-foreground">
            Set to "true" to let the panel automatically connect after the DayZ
            server process is started.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
