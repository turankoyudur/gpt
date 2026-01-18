import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiPatch, apiPost } from "@/lib/http";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

type Mod = {
  workshopId: string;
  name: string | null;
  enabled: boolean;
  installedPath: string | null;
  lastUpdateTs: number | null;
  sizeBytes: number | null;
};

export default function Mods() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [workshopId, setWorkshopId] = useState("");

  const mods = useQuery({
    queryKey: ["mods"],
    queryFn: () => api<Mod[]>("/mods"),
    refetchInterval: 5000,
  });

  const add = useMutation({
    mutationFn: () => apiPost<Mod>("/mods/add", { workshopId }),
    onSuccess: () => {
      setWorkshopId("");
      qc.invalidateQueries({ queryKey: ["mods"] });
      toast({ title: "Mod added" });
    },
    onError: (e: any) => toast({ title: "Add failed", description: `${e.code ?? ""} ${e.message}` }),
  });

  const install = useMutation({
    mutationFn: (id: string) => apiPost<any>("/mods/install", { workshopId: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mods"] });
      toast({ title: "Install complete (or queued)" });
    },
    onError: (e: any) => toast({ title: "Install failed", description: `${e.code ?? ""} ${e.message}` }),
  });

  const toggle = useMutation({
    mutationFn: (payload: { id: string; enabled: boolean }) =>
      apiPatch<Mod>("/mods/enable", { workshopId: payload.id, enabled: payload.enabled }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mods"] });
    },
    onError: (e: any) => toast({ title: "Update failed", description: `${e.code ?? ""} ${e.message}` }),
  });

  const scan = useMutation({
    mutationFn: () => api<any>("/mods/scan"),
    onSuccess: () => toast({ title: "Scan complete" }),
  });

  const list = mods.data ?? [];
  const enabledCount = useMemo(() => list.filter((m) => m.enabled).length, [list]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mods</h2>
          <p className="text-sm text-muted-foreground">
            Add workshop mods by ID, install via SteamCMD, enable/disable for -mod launch parameter.
          </p>
        </div>
        <Button variant="secondary" onClick={() => scan.mutate()} disabled={scan.isPending}>
          Scan Disk
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Mod</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-3">
          <Input
            placeholder="Workshop ID (numbers)"
            value={workshopId}
            onChange={(e) => setWorkshopId(e.target.value)}
          />
          <Button onClick={() => add.mutate()} disabled={!workshopId || add.isPending}>
            Add
          </Button>
          <div className="text-xs text-muted-foreground md:ml-auto flex items-center">
            Enabled: {enabledCount}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        {list.map((m) => (
          <Card key={m.workshopId}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span className="truncate">
                  {m.name ? m.name : `Workshop ${m.workshopId}`}
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Enabled</span>
                    <Switch
                      checked={m.enabled}
                      onCheckedChange={(v) => toggle.mutate({ id: m.workshopId, enabled: v })}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => install.mutate(m.workshopId)}
                    disabled={install.isPending}
                  >
                    Install/Update
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-muted-foreground">Workshop ID</div>
                  <div className="font-medium">{m.workshopId}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Installed Path</div>
                  <div className="font-medium truncate">{m.installedPath ?? "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Updated</div>
                  <div className="font-medium">
                    {m.lastUpdateTs ? new Date(m.lastUpdateTs * 1000).toISOString() : "-"}
                  </div>
                </div>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Tip: If DayZ doesn't load a mod, ensure the panel is run with enough permissions to create junctions
                inside your DayZ server directory.
              </p>
            </CardContent>
          </Card>
        ))}

        {list.length === 0 && (
          <div className="text-sm text-muted-foreground">No mods yet. Add one with its workshop ID.</div>
        )}
      </div>
    </div>
  );
}
