import MetricsCard from "./MetricsCard"
import { DashboardData } from "../../types/Dashboard"

interface MetricsGridProps {
  dashboardData: DashboardData;
  isLoading: boolean;
}

const MetricsGrid = ({ dashboardData, isLoading }: MetricsGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <MetricsCard
        title="Total Calls"
        value={dashboardData.totalCalls}
        isLoading={isLoading}
      />
      <MetricsCard
        title="This Month"
        value={dashboardData.callsThisMonth}
        isLoading={isLoading}
      />
      <MetricsCard
        title="Average Duration"
        value={dashboardData.averageDuration}
        isLoading={isLoading}
      />
    </div>
  )
}

export default MetricsGrid