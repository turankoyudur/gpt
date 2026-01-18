import { Users, Zap, Clock, Activity } from "lucide-react";
import StatCard from "@/components/StatCard";
import PlayerCard from "@/components/PlayerCard";

export default function Dashboard() {
  // Mock data - in real app, this would come from an API
  const onlinePlayers = [
    {
      id: "1",
      name: "SurvivalMaster",
      playerId: "76561198012345678",
      playtime: "45 hrs",
      status: "online" as const,
      kills: 23,
      deaths: 8,
    },
    {
      id: "2",
      name: "ZombieSH00TER",
      playerId: "76561198087654321",
      playtime: "32 hrs",
      status: "online" as const,
      kills: 15,
      deaths: 12,
    },
    {
      id: "3",
      name: "DesperateFarmer",
      playerId: "76561198056789012",
      playtime: "12 hrs",
      status: "online" as const,
      kills: 3,
      deaths: 5,
    },
  ];

  const recentActivity = [
    {
      id: "1",
      action: "Player joined",
      player: "SurvivalMaster",
      time: "5 minutes ago",
    },
    {
      id: "2",
      action: "Player left",
      player: "NightOwl",
      time: "12 minutes ago",
    },
    {
      id: "3",
      action: "Server restarted",
      player: "Admin",
      time: "2 hours ago",
    },
    {
      id: "4",
      action: "Player banned",
      player: "RudePlayer",
      time: "1 day ago",
    },
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome to your DayZ server management panel
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Players Online"
          value="3/32"
          icon={<Users className="w-6 h-6" />}
          trend={{ value: 15, isPositive: true }}
          color="emerald"
        />
        <StatCard
          label="Server Uptime"
          value="12d 8h"
          icon={<Clock className="w-6 h-6" />}
          color="cyan"
        />
        <StatCard
          label="CPU Usage"
          value="24%"
          icon={<Zap className="w-6 h-6" />}
          trend={{ value: 5, isPositive: true }}
          color="amber"
        />
        <StatCard
          label="Network"
          value="145 Mbps"
          icon={<Activity className="w-6 h-6" />}
          trend={{ value: 2, isPositive: false }}
          color="cyan"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Online Players */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground">
                Online Players
              </h3>
              <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-semibold">
                {onlinePlayers.length} Active
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {onlinePlayers.map((player) => (
                <PlayerCard
                  key={player.id}
                  name={player.name}
                  playerId={player.playerId}
                  playtime={player.playtime}
                  status={player.status}
                  kills={player.kills}
                  deaths={player.deaths}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div>
          <div className="bg-card border border-border rounded-lg p-6 h-full">
            <h3 className="text-xl font-bold text-foreground mb-6">
              Recent Activity
            </h3>

            <div className="space-y-4">
              {recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="pb-4 border-b border-border last:pb-0 last:border-0"
                >
                  <p className="text-sm font-medium text-foreground">
                    {item.action}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.player}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-2">
                    {item.time}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Server Controls */}
      <div className="mt-8">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">
            Server Controls
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="btn-primary px-4 py-3 rounded-lg font-semibold transition-all hover:shadow-lg hover:shadow-primary/20">
              Restart Server
            </button>
            <button className="btn-primary px-4 py-3 rounded-lg font-semibold transition-all hover:shadow-lg hover:shadow-primary/20">
              Save World
            </button>
            <button className="btn-secondary px-4 py-3 rounded-lg font-semibold">
              Broadcast Message
            </button>
            <button className="btn-secondary px-4 py-3 rounded-lg font-semibold">
              View Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
