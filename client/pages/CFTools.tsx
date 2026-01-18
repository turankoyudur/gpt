import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/http";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CFTools() {
  const [steamId64, setSteamId64] = useState("");

  const config = useQuery({ queryKey: ["cftools-config"], queryFn: () => api<any>("/cftools/config") });

  const pq = useQuery({
    queryKey: ["cftools-pq", steamId64],
    queryFn: () => api<any>(`/cftools/priority-queue?steamId64=${encodeURIComponent(steamId64)}`),
    enabled: false,
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">CFTools / GameLabs</h2>
        <p className="text-sm text-muted-foreground">
          Integration layer for GameLabs + CFTools Cloud Data API.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div>Configured: <span className="font-medium">{config.data?.configured ? "Yes" : "No"}</span></div>
          <div>ServerApiId: <span className="font-mono">{config.data?.serverApiId ?? ""}</span></div>
          <div>AppId: <span className="font-mono">{config.data?.appId ?? ""}</span></div>
          <div>Enterprise: <span className="font-medium">{config.data?.enterprise ? "Yes" : "No"}</span></div>
          <p className="text-xs text-muted-foreground">
            Fill these values from your CFTools Cloud panel. After saving, this page will enable more features.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Example: Priority Queue Lookup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <Input
              placeholder="SteamId64"
              value={steamId64}
              onChange={(e) => setSteamId64(e.target.value)}
            />
            <Button onClick={() => pq.refetch()} disabled={!steamId64}>
              Fetch
            </Button>
          </div>
          <pre className="text-xs bg-muted rounded-lg p-4 overflow-auto">
            {pq.isFetching ? "Loading..." : JSON.stringify(pq.data ?? null, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
