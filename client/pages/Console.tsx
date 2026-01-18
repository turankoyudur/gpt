import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiPost } from "@/lib/http";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type RconStatus = { connected: boolean; lastMessages: string[] };

export default function Console() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [cmd, setCmd] = useState("help");

  const status = useQuery({ queryKey: ["rcon-status"], queryFn: () => api<RconStatus>("/rcon/status"), refetchInterval: 2000 });

  const connect = useMutation({
    mutationFn: () => apiPost<any>("/rcon/connect"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rcon-status"] }),
    onError: (e: any) => toast({ title: "RCON connect failed", description: `${e.code ?? ""} ${e.message}` }),
  });

  const disconnect = useMutation({
    mutationFn: () => apiPost<any>("/rcon/disconnect"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rcon-status"] }),
  });

  const send = useMutation({
    mutationFn: () => apiPost<any>("/rcon/command", { cmd }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rcon-status"] });
      setCmd("");
    },
    onError: (e: any) => toast({ title: "Command failed", description: `${e.code ?? ""} ${e.message}` }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">RCON Console</h2>
          <p className="text-sm text-muted-foreground">Send BattlEye RCON commands. Messages are buffered locally.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => connect.mutate()} disabled={connect.isPending}>
            Connect
          </Button>
          <Button variant="destructive" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
            Disconnect
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          Connected: <span className="font-medium">{status.data?.connected ? "Yes" : "No"}</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Command</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Input value={cmd} onChange={(e) => setCmd(e.target.value)} placeholder="Type a BattlEye command (e.g., players)" />
          <Button onClick={() => send.mutate()} disabled={!cmd || send.isPending}>
            Send
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-black/60 text-white rounded-lg p-4 overflow-auto max-h-[520px]">
            {(status.data?.lastMessages ?? []).join("\n")}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
