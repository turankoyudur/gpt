import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiPut } from "@/lib/http";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type SettingsModel = {
  steamcmdPath: string;
  dayzServerPath: string;
  profilesPath: string;
  battleyeCfgPath: string;
  serverConfigFile: string;
  serverPort: number;
  additionalLaunchArgs: string;
  steamUser: string;
  steamPassword: string;
  cftoolsServerApiId: string;
  cftoolsAppId: string;
  cftoolsSecret: string;
  cftoolsEnterpriseKey: string;
};

export default function Settings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const q = useQuery({ queryKey: ["settings"], queryFn: () => api<SettingsModel>("/settings") });
  const [form, setForm] = useState<SettingsModel | null>(null);

  useEffect(() => {
    if (q.data) setForm(q.data);
  }, [q.data]);

  const save = useMutation({
    mutationFn: () => apiPut<any>("/settings", form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["config-files"] });
      toast({ title: "Settings saved" });
    },
    onError: (e: any) => toast({ title: "Save failed", description: `${e.code ?? ""} ${e.message}` }),
  });

  const health = useQuery({ queryKey: ["settings-health"], queryFn: () => api<any>("/settings/health"), enabled: !!form });

  const update = (k: keyof SettingsModel, v: any) => {
    if (!form) return;
    setForm({ ...form, [k]: v });
  };

  if (!form) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Settings</h2>
          <p className="text-sm text-muted-foreground">All important paths/parameters are editable here.</p>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          Save
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Health Check</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {health.data?.checks?.map((c: any) => (
            <div key={c.key} className="flex items-center justify-between gap-3">
              <div className="font-medium">{c.label}</div>
              <div className={`text-xs ${c.exists ? "text-status-online" : "text-status-offline"}`}>
                {c.exists ? "OK" : "Missing"}
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            If a path is missing, fix it here. The panel is designed so you don't have to manually edit config files.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paths (Windows)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="SteamCMD Path" value={form.steamcmdPath} onChange={(v) => update("steamcmdPath", v)} />
          <Field label="DayZ Server Path" value={form.dayzServerPath} onChange={(v) => update("dayzServerPath", v)} />
          <Field label="Profiles Path" value={form.profilesPath} onChange={(v) => update("profilesPath", v)} />
          <Field label="BattlEye CFG Path" value={form.battleyeCfgPath} onChange={(v) => update("battleyeCfgPath", v)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Launch Parameters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="serverDZ.cfg" value={form.serverConfigFile} onChange={(v) => update("serverConfigFile", v)} />
          <Field label="Game Port" value={String(form.serverPort)} onChange={(v) => update("serverPort", Number(v))} />
          <div className="md:col-span-2">
            <Label>Additional Launch Args</Label>
            <Textarea
              value={form.additionalLaunchArgs}
              onChange={(e) => update("additionalLaunchArgs", e.target.value)}
              className="min-h-[120px] font-mono"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Steam (for SteamCMD Workshop Downloads)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Steam Username" value={form.steamUser} onChange={(v) => update("steamUser", v)} />
          <Field label="Steam Password" value={form.steamPassword} onChange={(v) => update("steamPassword", v)} />
          <p className="text-xs text-muted-foreground md:col-span-2">
            For security, consider using a dedicated Steam account. In future versions we can add encryption/Windows
            Credential Manager.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CFTools / GameLabs</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Server API ID" value={form.cftoolsServerApiId} onChange={(v) => update("cftoolsServerApiId", v)} />
          <Field label="Application ID" value={form.cftoolsAppId} onChange={(v) => update("cftoolsAppId", v)} />
          <Field label="Secret" value={form.cftoolsSecret} onChange={(v) => update("cftoolsSecret", v)} />
          <Field label="Enterprise Key (optional)" value={form.cftoolsEnterpriseKey} onChange={(v) => update("cftoolsEnterpriseKey", v)} />
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
