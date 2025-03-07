"use client"

import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import Button from "../components/Button"
import PageTransition from "../components/PageTransition"

const HomePage = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // If user hasn't integrated with Zoom, redirect to Zoom integration page
    if (user && !user.zoomIntegrated) {
      navigate("/zoom-integration")
    }
  }, [user, navigate])

  return (
    <PageTransition>
      <div className="min-h-screen">
        <header className="bg-gray-900 shadow-lg">
          <div className="container mx-auto px-4 py-6 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">CallsCraft</h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-300">Welcome, {user?.name || "User"}</span>
              <Button variant="secondary" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Welcome to CallsCraft</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Your platform for seamless Zoom call management and scheduling
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div
              className="card hover:shadow-purple-900/20 hover:translate-y-[-5px] cursor-pointer"
              onClick={() => navigate("/dashboard")}
            >
              <div className="text-center">
                <div className="bg-purple-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-purple-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">View Dashboard</h3>
                <p className="text-gray-400">Access your call history, analytics, and scheduled calls</p>
              </div>
            </div>

            <div
              className="card hover:shadow-purple-900/20 hover:translate-y-[-5px] cursor-pointer"
              onClick={() => navigate("/create-call")}
            >
              <div className="text-center">
                <div className="bg-purple-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-purple-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Create Call</h3>
                <p className="text-gray-400">Start a new Zoom call with a client</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </PageTransition>
  )
}

export default HomePage

