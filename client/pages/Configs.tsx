import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiPut } from "@/lib/http";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function Configs() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [raw, setRaw] = useState("");

  const files = useQuery({ queryKey: ["config-files"], queryFn: () => api<any>("/config/files") });
  const battleye = useQuery({ queryKey: ["battleye-raw"], queryFn: () => api<{ text: string }>("/config/battleye/raw") });

  useEffect(() => {
    if (battleye.data) setRaw(battleye.data.text);
  }, [battleye.data]);

  const save = useMutation({
    mutationFn: () => apiPut<any>("/config/battleye/raw", { text: raw }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["battleye-raw"] });
      toast({ title: "Saved" });
    },
    onError: (e: any) => toast({ title: "Save failed", description: `${e.code ?? ""} ${e.message}` }),
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Configs</h2>
        <p className="text-sm text-muted-foreground">Edit BattlEye and other known config files from the web UI.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Known Paths</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {files.data?.files?.map((f: any) => (
            <div key={f.key} className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
              <div className="font-medium">{f.label}</div>
              <div className="text-muted-foreground break-all">{f.path}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>BEServer_x64.cfg (raw)</CardTitle>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            Save
          </Button>
        </CardHeader>
        <CardContent>
          <Textarea value={raw} onChange={(e) => setRaw(e.target.value)} className="min-h-[360px] font-mono" />
          <p className="mt-3 text-xs text-muted-foreground">
            This file controls BattlEye RCON (RConPassword/RConPort/RConIP). After saving, restart DayZ or reload
            BattlEye if necessary.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
