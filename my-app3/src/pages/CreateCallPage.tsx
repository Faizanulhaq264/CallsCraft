"use client"

import type React from "react"
import axios from 'axios'; // Add this import at the top

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import Button from "../components/Button"
import Input from "../components/Input"
import Card from "../components/Card"
import Navbar from "../components/Navbar"
import PageTransition from "../components/PageTransition"
import { PlusCircle, X } from "lucide-react"

// Define a type for accomplishments
interface Accomplishment {
  id: string
  text: string
}

const CreateCallPage = () => {
  const [step, setStep] = useState(1)
  const [clientName, setClientName] = useState("")
  const [accomplishments, setAccomplishments] = useState<Accomplishment[]>([{ id: "1", text: "" }])
  const [isStartingCall, setIsStartingCall] = useState(false)
  const [error, setError] = useState("")
  const { currentUser } = useAuth()
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

  const handleSubmitAccomplishments = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate that at least one accomplishment has text
    const hasValidAccomplishment = accomplishments.some((a) => a.text.trim() !== "")

    if (!hasValidAccomplishment) {
      setError("Please enter at least one accomplishment")
      return
    }

    setError("")
    setStep(3)
  }

  const handleAccomplishmentChange = (id: string, value: string) => {
    setAccomplishments((prev) => prev.map((a) => (a.id === id ? { ...a, text: value } : a)))
  }

  const addAccomplishment = () => {
    setAccomplishments((prev) => [...prev, { id: Date.now().toString(), text: "" }])
  }

  const removeAccomplishment = (id: string) => {
    // Don't remove if it's the last one
    if (accomplishments.length <= 1) return

    setAccomplishments((prev) => prev.filter((a) => a.id !== id))
  }

  const handleStartCall = async () => {
    setIsStartingCall(true);
    setError("");
  
    try {
      // Filter out empty accomplishments
      const validAccomplishments = accomplishments
        .filter((a) => a.text.trim() !== "")
        .map((a) => a.text);
  
      if (!currentUser?.id) {
        throw new Error("User not authenticated");
      }
  
      // Step 1: Create client in the database
      const createClientResponse = await axios.post(
        `${'http://localhost:4000'}/api/create-client`, 
        {
          clientName,
          userID: currentUser.id
        }
      );
  
      const clientID = createClientResponse.data.clientID;
      
      if (!clientID) {
        throw new Error("Failed to create client");
      }
  
      console.log("Client created successfully with ID:", clientID);
  
      // Step 2: Start the call in the database
      const startCallResponse = await axios.post(
        `${'http://localhost:4000'}/api/start-call`,
        {
          clientID,
          userID: currentUser.id
        }
      );
  
      const callData = startCallResponse.data;
      
      if (!callData.callID) {
        throw new Error("Failed to start call");
      }
  
      console.log("Call started successfully:", callData);
  
      // Store call data in localStorage for use in other pages
      // Include both the user-entered data and the database IDs
      localStorage.setItem(
        "callData",
        JSON.stringify({
          clientName,
          accomplishments: validAccomplishments,
          timestamp: new Date().toISOString(),
          callID: callData.callID,
          clientID: clientID,
          transcriptName: callData.transcriptName,
          startTime: callData.startTime
        })
      );
  
      // Navigate to the call page
      navigate("/active-call");
    } catch (error) {
      console.error("Failed to start call:", error);
      setError(
        error instanceof Error 
          ? `Failed to start the call: ${error.message}` 
          : "Failed to start the call. Please try again."
      );
    } finally {
      setIsStartingCall(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen">
        <Navbar />

        <main className="container mx-auto px-4 py-12 pt-24">
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
                    className={`
                    flex items-center justify-center w-10 h-10 rounded-full 
                    ${step >= 1 ? "bg-gradient-to-r from-purple-600 to-purple-500" : "bg-gray-800"} 
                    text-white font-bold transition-all duration-300
                  `}
                  >
                    1
                  </div>
                  <div
                    className={`
                    flex-1 h-1 mx-2 
                    ${step >= 2 ? "bg-gradient-to-r from-purple-600 to-purple-500" : "bg-gray-800"}
                    transition-all duration-500
                  `}
                  ></div>
                  <div
                    className={`
                    flex items-center justify-center w-10 h-10 rounded-full 
                    ${step >= 2 ? "bg-gradient-to-r from-purple-600 to-purple-500" : "bg-gray-800"} 
                    text-white font-bold transition-all duration-300
                  `}
                  >
                    2
                  </div>
                  <div
                    className={`
                    flex-1 h-1 mx-2 
                    ${step >= 3 ? "bg-gradient-to-r from-purple-600 to-purple-500" : "bg-gray-800"}
                    transition-all duration-500
                  `}
                  ></div>
                  <div
                    className={`
                    flex items-center justify-center w-10 h-10 rounded-full 
                    ${step >= 3 ? "bg-gradient-to-r from-purple-600 to-purple-500" : "bg-gray-800"} 
                    text-white font-bold transition-all duration-300
                  `}
                  >
                    3
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
                ) : step === 2 ? (
                  <div className="animate-fadeIn">
                    <h3 className="text-xl font-bold mb-4">Today's Accomplishments</h3>
                    <p className="text-gray-400 mb-6">
                      What would you like to accomplish in today's call with {clientName}?
                    </p>

                    {error && (
                      <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded mb-4">
                        {error}
                      </div>
                    )}

                    <form onSubmit={handleSubmitAccomplishments}>
                      <div className="space-y-4 mb-6">
                        {accomplishments.map((accomplishment, index) => (
                          <div key={accomplishment.id} className="flex items-center gap-2">
                            <div className="flex-1">
                              <Input
                                placeholder={`Accomplishment ${index + 1}`}
                                value={accomplishment.text}
                                onChange={(e) => handleAccomplishmentChange(accomplishment.id, e.target.value)}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAccomplishment(accomplishment.id)}
                              className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                              aria-label="Remove accomplishment"
                              disabled={accomplishments.length <= 1}
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between">
                        <button
                          type="button"
                          onClick={addAccomplishment}
                          className="flex items-center gap-2 text-purple-500 hover:text-purple-400 transition-colors"
                        >
                          <PlusCircle className="h-5 w-5" />
                          <span>Add Another</span>
                        </button>
                      </div>

                      <div className="flex justify-between mt-6">
                        <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                          Back
                        </Button>
                        <Button type="submit">Continue</Button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="animate-fadeIn text-center">
                    <h3 className="text-xl font-bold mb-4">Start Call</h3>
                    <p className="text-gray-400 mb-6">
                      You're about to start a call with <span className="text-white font-medium">{clientName}</span>
                    </p>

                    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 mb-6 text-left">
                      <h4 className="text-md font-medium mb-2">Today's Accomplishments:</h4>
                      <ul className="list-disc pl-5 space-y-1">
                        {accomplishments
                          .filter((a) => a.text.trim() !== "")
                          .map((a, index) => (
                            <li key={index} className="text-gray-300">
                              {a.text}
                            </li>
                          ))}
                      </ul>
                    </div>

                    {error && (
                      <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded mb-4">
                        {error}
                      </div>
                    )}

                    <div className="flex justify-between">
                      <Button variant="secondary" onClick={() => setStep(2)}>
                        Back
                      </Button>
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
                    </div>
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

