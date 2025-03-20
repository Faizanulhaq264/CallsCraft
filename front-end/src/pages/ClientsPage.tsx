"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import Button from "../components/Button"
import Card from "../components/Card"
import Navbar from "../components/Navbar"
import PageTransition from "../components/PageTransition"
import ClientsList from "../components/clients/ClientsList"
import ClientsToolbar from "../components/clients/ClientsToolbar"
import { mockClients } from "../data/mockClients"
import axios from "axios"

const ClientsPage = () => {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [clients, setClients] = useState(mockClients)
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchClients = async () => {
      if (!currentUser?.id) {
        setError("User not logged in")
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const response = await axios.get(`http://localhost:4000/api/clients`, {
          params: { userID: currentUser.id }
        })
        
        setClients(response.data)
        setError(null)
      } catch (err) {
        console.error("Error fetching clients:", err)
        setError("Failed to load clients. Please try again.")
        
        // Fallback to mock data in case of error
        setClients(mockClients)
      } finally {
        setIsLoading(false)
      }
    }

    fetchClients()
  }, [currentUser])

  // Filter clients based on search query
  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.company.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <PageTransition>
      <div className="min-h-screen">
        <Navbar />

        <main className="container mx-auto px-4 py-8 pt-24">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">Clients</h2>
            <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-800 text-white p-4 rounded-md mb-8">
              {error}
            </div>
          )}

          <ClientsToolbar 
            searchQuery={searchQuery} 
            onSearchChange={setSearchQuery} 
          />

          <Card>
            <ClientsList 
              isLoading={isLoading}
              clients={filteredClients}
              searchQuery={searchQuery}
              onClearSearch={() => setSearchQuery("")}
            />
          </Card>
        </main>
      </div>
    </PageTransition>
  )
}

export default ClientsPage

