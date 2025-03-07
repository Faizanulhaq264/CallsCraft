"use client"

import type React from "react"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import Button from "../components/Button"
import Input from "../components/Input"
import Card from "../components/Card"
import PageTransition from "../components/PageTransition"

const CreateCallPage = () => {
  const [step, setStep] = useState(1)
  const [clientName, setClientName] = useState("")
  const [isStartingCall, setIsStartingCall] = useState(false)
  const [error, setError] = useState("")
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleSubmitClientName = (e: React.FormEvent) => {
    e.preventDefault()

    if (!clientName.trim()) {
      setError("Please enter the client name")
      return
    }

    setError("")
    setStep(2)
  }

  const handleStartCall = async () => {
    setIsStartingCall(true)

    try {
      // Simulate API call to backend endpoint to start the call
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Redirect to a success page or show success message
      navigate("/dashboard")
    } catch (error) {
      console.error("Failed to start call:", error)
      setError("Failed to start the call. Please try again.")
    } finally {
      setIsStartingCall(false)
    }
  }

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
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Create Call</h2>
              <Button variant="secondary" onClick={() => navigate("/dashboard")}>
                Back to Dashboard
              </Button>
            </div>

            <Card>
              <div className="mb-6">
                <div className="flex items-center mb-8">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 1 ? "bg-purple-600" : "bg-gray-700"} text-white font-bold`}
                  >
                    1
                  </div>
                  <div className={`flex-1 h-1 mx-2 ${step >= 2 ? "bg-purple-600" : "bg-gray-700"}`}></div>
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 2 ? "bg-purple-600" : "bg-gray-700"} text-white font-bold`}
                  >
                    2
                  </div>
                </div>

                {step === 1 ? (
                  <div className="animate-fadeIn">
                    <h3 className="text-xl font-bold mb-4">Client Information</h3>
                    <p className="text-gray-400 mb-6">Enter the name of the client you want to call</p>

                    {error && (
                      <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded mb-4">
                        {error}
                      </div>
                    )}

                    <form onSubmit={handleSubmitClientName}>
                      <Input
                        label="Client Name"
                        placeholder="Enter client name"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                      />

                      <Button type="submit" className="mt-6">
                        Continue
                      </Button>
                    </form>
                  </div>
                ) : (
                  <div className="animate-fadeIn text-center">
                    <h3 className="text-xl font-bold mb-4">Start Call</h3>
                    <p className="text-gray-400 mb-6">
                      You're about to start a call with <span className="text-white font-medium">{clientName}</span>
                    </p>

                    {error && (
                      <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded mb-4">
                        {error}
                      </div>
                    )}

                    <Button onClick={handleStartCall} disabled={isStartingCall} className="px-8 py-4 text-lg">
                      {isStartingCall ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-3"></div>
                          Starting Call...
                        </div>
                      ) : (
                        <>Start Call</>
                      )}
                    </Button>

                    <button className="block mx-auto mt-4 text-gray-400 hover:text-white" onClick={() => setStep(1)}>
                      Go Back
                    </button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </main>
      </div>
    </PageTransition>
  )
}

export default CreateCallPage

