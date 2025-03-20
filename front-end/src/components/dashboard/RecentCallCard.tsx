import { useNavigate } from "react-router-dom"
import { ArrowRight, Clock, Phone, CheckCircle, Circle } from "lucide-react"
import Card from "../Card"
import Button from "../Button"
import { RecentCall } from "../../types/Dashboard"

interface RecentCallCardProps {
  recentCall: RecentCall | null;
  isLoading: boolean;
}

const RecentCallCard = ({ recentCall, isLoading }: RecentCallCardProps) => {
  const navigate = useNavigate()

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-4">Recent Call</h3>
      {isLoading ? (
        <div className="h-64 w-full bg-gray-800/50 animate-pulse rounded"></div>
      ) : recentCall ? (
        <div className="h-64 flex flex-col">
          <div className="bg-gray-900/50 rounded-lg p-6 flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-xl font-medium text-white mb-1">{recentCall.clientName}</h4>
                <div className="flex items-center gap-4 text-gray-400">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{recentCall.date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    <span>{recentCall.duration}</span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-800 rounded-full px-3 py-1 text-xs font-medium text-gray-300">Recent</div>
            </div>

            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-400 mb-2">Task Status</h5>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-purple-500" />
                  <span className="text-gray-300">{recentCall.tasks.completed} Completed</span>
                </div>
                <div className="flex items-center gap-1">
                  <Circle className="h-4 w-4 text-cyan-500" />
                  <span className="text-gray-300">{recentCall.tasks.incomplete} Incomplete</span>
                </div>
              </div>
            </div>

            <div className="mt-auto">
              <Button
                onClick={() => navigate(`/client/${recentCall.id}`)}
                className="w-full flex items-center justify-center gap-2"
              >
                View Details
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center bg-gray-900/50 rounded-lg">
          <div className="text-center">
            <p className="text-gray-400 mb-4">No recent calls found</p>
            <Button onClick={() => navigate("/create-call")}>Create Your First Call</Button>
          </div>
        </div>
      )}
    </Card>
  )
}

export default RecentCallCard