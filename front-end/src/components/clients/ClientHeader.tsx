import { ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import Button from "../Button"

interface ClientHeaderProps {
  name: string;
  company: string;
}

const ClientHeader = ({ name, company }: ClientHeaderProps) => {
  const navigate = useNavigate()
  
  return (
    <div className="flex justify-between items-center mb-8">
      <div className="flex items-center gap-3">
        <Button variant="secondary" onClick={() => navigate("/clients")} className="p-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-3xl font-bold">{name}</h2>
        {/* <div className="bg-gray-800 rounded-full px-3 py-1 text-xs font-medium text-gray-300">
          {company}
        </div> */}
      </div>
      {/* <Button onClick={() => navigate("/create-call")}>Schedule New Call</Button> */}
    </div>
  )
}

export default ClientHeader