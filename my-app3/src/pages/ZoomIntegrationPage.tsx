"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Button from "../components/Button"
import Card from "../components/Card"
import PageTransition from "../components/PageTransition"

const ZoomIntegrationPage = () => {
  const [isIntegrating, setIsIntegrating] = useState(false)
  const [isIntegrated, setIsIntegrated] = useState(false)
  const navigate = useNavigate()

  const handleIntegrateWithZoom = async () => {
    setIsIntegrating(true)

    try {
      // Simulate API call to backend endpoint for Zoom authentication
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Update user in localStorage to reflect Zoom integration
      const storedUser = localStorage.getItem("user")
      if (storedUser) {
        const user = JSON.parse(storedUser)
        user.zoomIntegrated = true
        localStorage.setItem("user", JSON.stringify(user))
      }

      setIsIntegrated(true)
    } catch (error) {
      console.error("Zoom integration error:", error)
    } finally {
      setIsIntegrating(false)
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          {!isIntegrated ? (
            <div className="text-center">
              <div className="mb-6">
                <div className="bg-purple-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10 text-purple-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2">Connect with Zoom</h2>
                <p className="text-gray-400 mb-8">To start making calls, you need to connect your Zoom account</p>
              </div>

              <Button onClick={handleIntegrateWithZoom} disabled={isIntegrating} className="px-8 py-4 text-lg">
                {isIntegrating ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-3"></div>
                    Connecting...
                  </div>
                ) : (
                  <>Connect with Zoom</>
                )}
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <div className="mb-6">
                <div className="bg-green-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2">Successfully Connected!</h2>
                <p className="text-gray-400 mb-8">
                  Your Zoom account has been successfully connected. You can now start making calls.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button onClick={() => navigate("/dashboard")}>View Dashboard</Button>
                <Button onClick={() => navigate("/create-call")}>Create Call</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </PageTransition>
  )
}

export default ZoomIntegrationPage

