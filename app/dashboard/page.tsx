import { StatsCard } from "@/components/dashboard/stats-card";
import { executeQuery } from "@/x/db";

async function getDashboardStats() {
  const today = new Date().toISOString().split('T')[0];
  const query = `
    SELECT 
      COUNT(*) as total_queries,
      AVG(time_elapsed) as avg_time,
      MAX(time_elapsed) as max_time
    FROM dbo.webservice_logs
    WHERE CAST(query_datetime AS DATE) = '${today}'
  `;
  
  return await executeQuery(query);
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Total Queries Today"
          value={stats[0]?.total_queries || 0}
        />
        <StatsCard
          title="Average Query Time"
          value={`${(stats[0]?.avg_time || 0).toFixed(2)}s`}
        />
        <StatsCard
          title="Max Query Time"
          value={`${(stats[0]?.max_time || 0).toFixed(2)}s`}
        />
      </div>
    </div>
  );
}