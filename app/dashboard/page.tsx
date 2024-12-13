'use client';
import { StatsCard } from "@/components/dashboard/stats-card";
import { ApiResponse, WebserviceLogsCalculated } from "@/types/tables";
import axios from "axios";
import { useEffect, useState } from "react";

export default async function DashboardPage({databaseId}: {databaseId: string}) {
  const [stats, setStats] = useState<WebserviceLogsCalculated>();
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const getStats = async () => {
      try {
        setStatsLoading(true);
        const response = await axios.get<ApiResponse<WebserviceLogsCalculated>>(`/api/${databaseId}/webservice_logs/stats`);
        setStats(response.data.data[0]);
      } catch (error) { } finally {
        setStatsLoading(false);
      }
    };
    getStats();
  }, []);
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Total Queries Today"
          value={statsLoading ? "Loading..." : stats?.total_queries || 0}
        />
        <StatsCard
          title="Average Query Time"
          value={statsLoading ? "Loading..." : `${(stats?.avg_time || 0).toFixed(2)}s`}
        />
        <StatsCard
          title="Max Query Time"
          value={statsLoading ? "Loading..." : `${(stats?.max_time || 0).toFixed(2)}s`}
        />
      </div>
    </div>
  );
}