import { useNavigate } from "react-router-dom"
import Button from "../Button"
import Card from "../Card"
import Navbar from "../Navbar"
import PageTransition from "../PageTransition"

const ClientNotFound = () => {
  const navigate = useNavigate()
  
  return (
    <PageTransition>
      <div className="min-h-screen">
        <Navbar />
        <main className="container mx-auto px-4 py-8 pt-24">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">Client Not Found</h2>
            <Button onClick={() => navigate("/clients")}>Back to Clients</Button>
          </div>
          <Card className="p-12 text-center">
            <p className="text-gray-400 mb-4">The client you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate("/clients")}>View All Clients</Button>
          </Card>
        </main>
      </div>
    </PageTransition>
  )
}

export default ClientNotFound