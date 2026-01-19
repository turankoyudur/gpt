import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiPost } from "@/lib/http";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ServerStatus = {
  running: boolean;
  pid: number | null;
  startedAt: string | null;
  lastExit: { code: number | null; signal: string | null } | null;
};

type TailResp = {
  file: string;
  lines: string[];
};

export default function Server() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const logFile = "dayz-server-current.log";

  const status = useQuery({
    queryKey: ["server-status"],
    queryFn: () => api<ServerStatus>("/server/status"),
    refetchInterval: 3000,
  });

  const start = useMutation({
    mutationFn: () => apiPost<any>("/server/start"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["server-status"] });
      toast({ title: "Server start requested" });
    },
    onError: (e: any) => toast({ title: "Start failed", description: `${e.code ?? ""} ${e.message}` }),
  });

  const stop = useMutation({
    mutationFn: () => apiPost<any>("/server/stop"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["server-status"] });
      toast({ title: "Server stop requested" });
    },
    onError: (e: any) => toast({ title: "Stop failed", description: `${e.code ?? ""} ${e.message}` }),
  });

  const restart = useMutation({
    mutationFn: () => apiPost<any>("/server/restart"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["server-status"] });
      toast({ title: "Server restart requested" });
    },
    onError: (e: any) => toast({ title: "Restart failed", description: `${e.code ?? ""} ${e.message}` }),
  });

  const s = status.data;
  const logTail = useQuery({
    queryKey: ["logs-tail", logFile],
    queryFn: () => api<TailResp>(`/logs/tail?file=${encodeURIComponent(logFile)}&lines=200`),
    refetchInterval: 2000,
    retry: false,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Server Control</h2>
        <div className="flex gap-2">
          <Button onClick={() => start.mutate()} disabled={!!s?.running || start.isPending}>
            Start
          </Button>
          <Button variant="secondary" onClick={() => restart.mutate()} disabled={!s?.running || restart.isPending}>
            Restart
          </Button>
          <Button variant="destructive" onClick={() => stop.mutate()} disabled={!s?.running || stop.isPending}>
            Stop
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Running</div>
              <div className="font-medium">{s?.running ? "Yes" : "No"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">PID</div>
              <div className="font-medium">{s?.pid ?? "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Started</div>
              <div className="font-medium">{s?.startedAt ?? "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Last Exit</div>
              <div className="font-medium">
                {s?.lastExit ? `code=${s.lastExit.code ?? "-"} signal=${s.lastExit.signal ?? "-"}` : "-"}
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Note: v0.1 uses a simple process supervisor. For production usage you can later run this panel as a Windows
            service and let it manage DayZ with scheduled restarts and health checks.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Server Monitor</CardTitle>
            <div className="text-xs text-muted-foreground">{logFile} • auto-refreshing every 2s</div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={cn("h-2 w-2 rounded-full", s?.running ? "bg-emerald-500" : "bg-muted-foreground/40")}
            />
            <span>{s?.running ? "Live" : "Offline"}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border border-muted/50 rounded-lg bg-white">
            <div className="flex items-center justify-between border-b border-muted/50 bg-muted/20 px-3 py-1 text-xs">
              <div className="font-medium text-muted-foreground">
                DayZ Console (RPT): {s?.running ? "running" : "stopped"}
              </div>
              <div className="text-muted-foreground">
                {s?.pid ? `PID ${s.pid}` : "PID -"}
              </div>
            </div>
            <pre className="text-[11px] leading-relaxed font-mono bg-black text-emerald-200 p-4 overflow-auto min-h-[360px] max-h-[520px]">
              {logTail.isError
                ? "Log file not found yet. Start the server to begin streaming output."
                : (logTail.data?.lines ?? []).join("\n")}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
