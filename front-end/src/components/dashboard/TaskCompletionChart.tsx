import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { CheckCircle, Circle } from "lucide-react"
import Card from "../Card"

interface TaskData {
  completed: number;
  incomplete: number;
}

interface TaskCompletionChartProps {
  taskData: TaskData;
  isLoading: boolean;
}

const TaskCompletionChart = ({ taskData, isLoading }: TaskCompletionChartProps) => {
  // Convert string values to numbers if needed
  const completed = typeof taskData.completed === 'string' 
    ? parseInt(taskData.completed) 
    : taskData.completed;
    
  const incomplete = typeof taskData.incomplete === 'string' 
    ? parseInt(taskData.incomplete) 
    : taskData.incomplete;

  // Data for the pie chart
  const chartData = [
    { name: "Completed", value: completed, color: "#8b5cf6" },
    { name: "Incomplete", value: incomplete, color: "#06b6d4" },
  ]

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-4">Task Completion</h3>
      {isLoading ? (
        <div className="h-64 w-full bg-gray-800/50 animate-pulse rounded flex items-center justify-center">
          <p className="text-gray-600">Loading chart data...</p>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="110%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${value} Tasks`, "Count"]}
                contentStyle={{
                  backgroundColor: "#1f2937",
                  borderColor: "#374151",
                  borderRadius: "0.375rem",
                  color: "white",
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => <span className="text-gray-300">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="mt-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-purple-500" />
          <span className="text-gray-300">{completed} Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <Circle className="h-5 w-5 text-cyan-500" />
          <span className="text-gray-300">{incomplete} Incomplete</span>
        </div>
      </div>
    </Card>
  )
}

export default TaskCompletionChart