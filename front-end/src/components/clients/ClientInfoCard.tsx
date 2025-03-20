import { Clock, Phone } from "lucide-react"
import Card from "../Card"
import { ClientDetails } from "../../types/ClientDetails"

interface ClientInfoCardProps {
  client: ClientDetails;
  completedTasks: number;
  totalTasks: number;
}

const ClientInfoCard = ({ client, completedTasks, totalTasks }: ClientInfoCardProps) => {
  return (
    <Card className="lg:col-span-1 p-6">
      <h3 className="text-xl font-bold mb-4">Client Information</h3>
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-400">Last Call</h4>
          <div className="flex items-center gap-4 text-white">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-gray-400" />
              <span>{client.lastCall.date}</span>
            </div>
            <div className="flex items-center gap-1">
              <Phone className="h-4 w-4 text-gray-400" />
              <span>{client.lastCall.duration}</span>
            </div>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-400">Task Completion</h4>
          <div className="flex items-center gap-2">
            <div className="w-full bg-gray-800 rounded-full h-2.5">
              <div
                className="bg-gradient-to-r from-purple-600 to-purple-500 h-2.5 rounded-full"
                style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
              ></div>
            </div>
            <span className="text-white text-sm">
              {completedTasks}/{totalTasks}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default ClientInfoCard