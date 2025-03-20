import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import Card from "../Card"
import { AnalyticsData } from "../../types/ClientDetails"

type ChartType = "line" | "area" | "bar";

interface AnalyticsChartProps {
  title: string;
  chartType: ChartType;
  data: AnalyticsData[];
  dataKey: string;
  xAxisKey?: string; // Add this prop
  color: string;
}

const AnalyticsChart = ({ 
  title, 
  chartType, 
  data, 
  dataKey, 
  xAxisKey = "time", // Default to "time" if not provided
  color 
}: AnalyticsChartProps) => {
  const tooltipStyle = {
    backgroundColor: "#1f2937",
    borderColor: "#374151",
    borderRadius: "0.375rem",
    color: "white",
  }

  const renderChart = () => {
    switch (chartType) {
      case "line":
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey={xAxisKey} stroke="#9CA3AF" tick={{ fill: "#9CA3AF" }} />
            <YAxis stroke="#9CA3AF" tick={{ fill: "#9CA3AF" }} domain={[0, 100]} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ color: "#9CA3AF" }} />
            <Line
              type="monotone"
              dataKey="value"
              name={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, r: 4 }}
              activeDot={{ r: 6, fill: color }}
            />
          </LineChart>
        )
      case "area":
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey={xAxisKey} stroke="#9CA3AF" tick={{ fill: "#9CA3AF" }} />
            <YAxis stroke="#9CA3AF" tick={{ fill: "#9CA3AF" }} domain={[0, 100]} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ color: "#9CA3AF" }} />
            <Area
              type="monotone"
              dataKey="value"
              name={dataKey}
              stroke={color}
              fill={color}
              fillOpacity={0.2}
            />
          </AreaChart>
        )
      case "bar":
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey={xAxisKey} stroke="#9CA3AF" tick={{ fill: "#9CA3AF" }} />
            <YAxis stroke="#9CA3AF" tick={{ fill: "#9CA3AF" }} domain={[0, 100]} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ color: "#9CA3AF" }} />
            <Bar dataKey="value" name={dataKey} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        )
    }
  }

  return (
    <Card className="p-6">
      <h4 className="text-lg font-bold mb-4">{title}</h4>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export default AnalyticsChart