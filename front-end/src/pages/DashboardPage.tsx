"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import Button from "../components/Button"
import Navbar from "../components/Navbar"
import PageTransition from "../components/PageTransition"
import MetricsGrid from "../components/dashboard/MetricsGrid"
import TaskCompletionChart from "../components/dashboard/TaskCompletionChart"
import RecentCallCard from "../components/dashboard/RecentCallCard"
import QuickActions from "../components/dashboard/QuickActions"
import { mockDashboardData } from "../data/mockDashboard"
import { DashboardData } from "../types/Dashboard"
import axios from "axios"

const DashboardPage = () => {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [dashboardData, setDashboardData] = useState<DashboardData>(mockDashboardData)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentUser?.id) {
        setError("User not logged in")
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const response = await axios.get(`${"http://localhost:4000"}/api/dashboard-data`, {
          params: { userID: currentUser.id }
        })
        
        setDashboardData(response.data)
        setError(null)
      } catch (err) {
        console.error("Error fetching dashboard data:", err)
        setError("Failed to load dashboard data. Please try again.")
        
        // Fallback to mock data in case of error
        setDashboardData(mockDashboardData)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [currentUser])

  return (
    <PageTransition>
      <div className="min-h-screen">
        <Navbar />

        <main className="container mx-auto px-4 py-8 pt-24">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">Dashboard</h2>
            <Button onClick={() => navigate("/create-call")}>Create New Call</Button>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-800 text-white p-4 rounded-md mb-8">
              {error}
            </div>
          )}

          {/* Metrics Cards */}
          <MetricsGrid 
            dashboardData={dashboardData} 
            isLoading={isLoading} 
          />

          {/* Task Completion and Recent Call */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <TaskCompletionChart 
              taskData={dashboardData.tasks} 
              isLoading={isLoading} 
            />
            <RecentCallCard 
              recentCall={dashboardData.recentCall} 
              isLoading={isLoading} 
            />
          </div>

          {/* Quick Actions */}
          <QuickActions />
        </main>
      </div>
    </PageTransition>
  )
}

export default DashboardPage

