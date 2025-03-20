"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Button from "../components/Button"
import Card from "../components/Card"
import Navbar from "../components/Navbar"
import PageTransition from "../components/PageTransition"
import { useAuth } from "../context/AuthContext"

const ZoomIntegrationPage = () => {
  const { currentUser, isZoomIntegrated, setZoomIntegrated } = useAuth()
  
  const [isIntegrating, setIsIntegrating] = useState(false)
  const [isIntegrated, setIsIntegrated] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    console.log("ZoomIntegrationPage mounted, checking URL params");
    // Check URL parameters for Zoom connection status
    const urlParams = new URLSearchParams(window.location.search);
    const connected = urlParams.get('connected');
    const error = urlParams.get('error');
    
    console.log("URL params:", { connected, error });
    
    if (connected === 'true') {
      console.log("Connected is true, updating Zoom integration status");
      // Update Zoom integration status
      setZoomIntegrated(true);
      setIsIntegrated(true);
      
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      console.log("Error in Zoom integration:", error);
      // Handle error cases
      
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Check if already integrated
    if (isZoomIntegrated) {
      console.log("User is already Zoom integrated");
      setIsIntegrated(true);
    }
  }, [isZoomIntegrated, setZoomIntegrated]);

  const handleIntegrateWithZoom = async () => {
    setIsIntegrating(true)

    try {
      // Redirect to Zoom auth endpoint with userId
      window.location.href = `http://localhost:4000/api/auth/zoom?userId=${currentUser.id}`
    } catch (error) {
      console.error("Zoom integration error:", error)
      setIsIntegrating(false)
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen">
        <Navbar />

        <div className="flex items-center justify-center p-4 min-h-screen">
          <Card className="w-full max-w-lg">
            {!isIntegrated ? (
              <div className="text-center">
                <div className="mb-6">
                  <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-700/30">
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
                  <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-700/30">
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
                  <Button
                    onClick={() => navigate("/dashboard")}
                    className="bg-gradient-to-r from-purple-600 to-purple-500"
                  >
                    View Dashboard
                  </Button>
                  <Button
                    onClick={() => navigate("/create-call")}
                    variant="secondary"
                    className="bg-gradient-to-r from-cyan-600 to-cyan-500"
                  >
                    Create Call
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageTransition>
  )
}

export default ZoomIntegrationPage

