import { ArrowRight, Circle, CheckCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Client } from "../../types/Client"

interface ClientCardProps {
  client: Client;
}

const ClientCard = ({ client }: ClientCardProps) => {
  const navigate = useNavigate()
  
  return (
    <div
      className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-all duration-300 cursor-pointer"
      onClick={() => navigate(`/client/${client.id}`)}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h4 className="text-lg font-medium text-white">{client.name}</h4>
          <p className="text-gray-400">{client.company}</p>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-purple-500" />
              <span className="text-gray-300">{client.tasks.completed}</span>
            </div>
            <div className="flex items-center gap-1">
              <Circle className="h-4 w-4 text-cyan-500" />
              <span className="text-gray-300">{client.tasks.incomplete}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-gray-400">
            <span>Last call: {client.lastCall}</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClientCard