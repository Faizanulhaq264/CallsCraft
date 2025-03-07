"use client"

import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import Button from "../components/Button"
import PageTransition from "../components/PageTransition"

const DashboardPage = () => {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()

  // Mock data for dashboard
  const recentCalls = [
    { id: 1, client: "John Doe", date: "2023-05-15", duration: "45 min" },
    { id: 2, client: "Jane Smith", date: "2023-05-14", duration: "30 min" },
    { id: 3, client: "Bob Johnson", date: "2023-05-12", duration: "60 min" },
  ]

  return (
    <PageTransition>
      <div className="min-h-screen">
        <header className="bg-black border-b border-gray-800 shadow-lg">
          <div className="container mx-auto px-4 py-6 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white flex items-center">
              <span className="bg-gradient-to-r from-purple-500 to-cyan-500 bg-clip-text text-transparent">
                CallsCraft
              </span>
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-300">Welcome, {currentUser?.name || "User"}</span>
              <Button variant="secondary" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">Dashboard</h2>
            <Button onClick={() => navigate("/create-call")}>Create New Call</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-gray-900 to-black border border-purple-900/30 rounded-xl p-6 shadow-lg hover:shadow-purple-900/10 transition-all duration-300">
              <h3 className="text-lg font-medium text-gray-300 mb-2">Total Calls</h3>
              <p className="text-3xl font-bold text-white">24</p>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-black border border-purple-900/30 rounded-xl p-6 shadow-lg hover:shadow-purple-900/10 transition-all duration-300">
              <h3 className="text-lg font-medium text-gray-300 mb-2">This Month</h3>
              <p className="text-3xl font-bold text-white">8</p>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-black border border-purple-900/30 rounded-xl p-6 shadow-lg hover:shadow-purple-900/10 transition-all duration-300">
              <h3 className="text-lg font-medium text-gray-300 mb-2">Average Duration</h3>
              <p className="text-3xl font-bold text-white">32 min</p>
            </div>
          </div>

          <div className="card mb-8">
            <h3 className="text-xl font-bold mb-4">Recent Calls</h3>

            {recentCalls.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-4 text-gray-400">Client</th>
                      <th className="text-left py-3 px-4 text-gray-400">Date</th>
                      <th className="text-left py-3 px-4 text-gray-400">Duration</th>
                      <th className="text-right py-3 px-4 text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCalls.map((call) => (
                      <tr key={call.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                        <td className="py-3 px-4">{call.client}</td>
                        <td className="py-3 px-4">{call.date}</td>
                        <td className="py-3 px-4">{call.duration}</td>
                        <td className="py-3 px-4 text-right">
                          <button className="text-purple-500 hover:text-purple-400">View Details</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-400">No recent calls found.</p>
            )}
          </div>

          <div className="card">
            <h3 className="text-xl font-bold mb-4">Upcoming Calls</h3>
            <p className="text-gray-400">No upcoming calls scheduled.</p>
            <Button className="mt-4" onClick={() => navigate("/create-call")}>
              Schedule a Call
            </Button>
          </div>
        </main>
      </div>
    </PageTransition>
  )
}

export default DashboardPage

