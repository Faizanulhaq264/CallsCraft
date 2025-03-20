import { useNavigate } from "react-router-dom"
import { ArrowRight, Phone } from "lucide-react"
import Card from "../Card"
import Button from "../Button"

const QuickActions = () => {
  const navigate = useNavigate()
  
  return (
    <Card>
      <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Button onClick={() => navigate("/create-call")} className="flex items-center justify-center gap-2">
          <Phone className="h-5 w-5" />
          Schedule a Call
        </Button>
        <Button
          variant="secondary"
          onClick={() => navigate("/clients")}
          className="flex items-center justify-center gap-2"
        >
          <ArrowRight className="h-5 w-5" />
          View All Clients
        </Button>
        {/* Demo Active Call button removed */}
      </div>
    </Card>
  )
}

export default QuickActions