"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import Navbar from "../components/Navbar"
import PageTransition from "../components/PageTransition"
import Button from "../components/Button"
import Card from "../components/Card"
import ClientDetailsSkeleton from "../components/clients/ClientDetailsSkeleton"
import ClientNotFound from "../components/clients/ClientNotFound"
import ClientHeader from "../components/clients/ClientHeader"
import ClientInfoCard from "../components/clients/ClientInfoCard"
import CallNotesCard from "../components/clients/CallNotesCard"
import TasksList from "../components/clients/TasksList"
import AnalyticsChart from "../components/clients/AnalyticsChart"
import { mockClientData } from "../data/mockClientDetails"
import { ClientDetails } from "../types/ClientDetails"
import { Download, FileText, Check } from "lucide-react"
import axios from "axios"

const ClientDetailsPage = () => {
  const { id } = useParams<{ id: string }>()
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [client, setClient] = useState<ClientDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  // Download-related states
  const [lastCallID, setLastCallID] = useState<number | null>(null)
  const [isDownloadingTranscript, setIsDownloadingTranscript] = useState(false)
  const [isDownloadingSummary, setIsDownloadingSummary] = useState(false)
  const [downloadedTranscript, setDownloadedTranscript] = useState(false)
  const [downloadedSummary, setDownloadedSummary] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Task debouncing-related state and refs
  const [pendingTaskUpdates, setPendingTaskUpdates] = useState<Map<number, boolean>>(new Map())
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Add these state variables to the component
  const [analytics, setAnalytics] = useState({
    attention: [],
    mood: [],
    valueInternalization: [],
    cognitiveResonance: []
  });
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // Function to send pending task updates to the server
  const flushTaskUpdates = useCallback(async () => {
    if (!currentUser?.id || pendingTaskUpdates.size === 0) return
    
    // Clone and clear pending updates
    const updates = new Map(pendingTaskUpdates)
    setPendingTaskUpdates(new Map())
    
    for (const [taskId, status] of updates.entries()) {
      try {
        await axios.put(`http://localhost:4000/api/task/${taskId}`, {
          status,
          userID: currentUser.id
        })
        console.log(`Task ${taskId} updated to ${status ? 'completed' : 'incomplete'}`)
      } catch (err) {
        console.error(`Error updating task ${taskId}:`, err)
        setError("Failed to update one or more tasks. Please try again.")
      }
    }
  }, [pendingTaskUpdates, currentUser?.id])

  // Effect to handle component unmount and save pending updates
  useEffect(() => {
    return () => {
      // When component unmounts, flush any pending updates
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      flushTaskUpdates()
    }
  }, [flushTaskUpdates])

  useEffect(() => {
    const fetchClientDetails = async () => {
      if (!id || !currentUser?.id) {
        setError("Missing required information")
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        // Get client details
        const response = await axios.get(`http://localhost:4000/api/client/${id}`, {
          params: { userID: currentUser.id }
        })
        
        setClient(response.data)
        
        // Get the most recent call ID for this client
        try {
          const callResponse = await axios.get(`http://localhost:4000/api/client-last-call-id`, {
            params: { clientID: id, userID: currentUser.id }
          })
          
          if (callResponse.data && callResponse.data.callID) {
            setLastCallID(callResponse.data.callID)
          }
        } catch (callErr) {
          console.log("No recent calls found for this client")
        }
        
        setError(null)
      } catch (err) {
        console.error("Error fetching client details:", err)
        setError("Failed to load client details. Please try again.")
        // Fallback to mock data
        setClient(mockClientData)
      } finally {
        setIsLoading(false)
      }
    }

    fetchClientDetails()
  }, [id, currentUser])

  // Add this effect to fetch analytics when lastCallID is available
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!lastCallID) return;
      
      setIsLoadingAnalytics(true);
      try {
        const response = await axios.get(`http://localhost:4000/api/call-analytics/${lastCallID}`);
        setAnalytics(response.data);
      } catch (err) {
        console.log("No analytics data available for this call");
        // Don't set error - analytics are optional
      } finally {
        setIsLoadingAnalytics(false);
      }
    };
    
    fetchAnalytics();
  }, [lastCallID]);

  // Debounced task toggle handler
  const handleToggleTask = (taskId: number) => {
    if (!client || !currentUser?.id) return

    // Find current task and its status
    const task = client.tasks.find(t => t.id === taskId)
    if (!task) return
    
    // Calculate new status (toggle current one)
    const newStatus = !task.completed
    
    // Update UI immediately for responsive feel
    setClient({
      ...client,
      tasks: client.tasks.map((task) => 
        task.id === taskId ? { ...task, completed: newStatus } : task
      ),
    })
    
    // Add to pending updates
    setPendingTaskUpdates(prev => {
      const updated = new Map(prev)
      updated.set(taskId, newStatus)
      return updated
    })
    
    // Clear existing timer if there is one
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    // Set new timer to send updates after 3 seconds of inactivity
    debounceTimerRef.current = setTimeout(() => {
      flushTaskUpdates()
      debounceTimerRef.current = null
    }, 3000) // 3 second debounce
  }

  // Handler for downloading transcript
  const handleDownloadTranscript = async () => {
    if (!lastCallID) {
      setError("No recent call found for this client")
      return
    }

    try {
      // Create a hidden a tag to trigger the download
      const link = document.createElement('a')
      link.href = `http://localhost:4000/api/download-file?callID=${lastCallID}&fileType=transcript`
      link.setAttribute('download', `transcript_call_id_${lastCallID}.txt`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      return Promise.resolve()
    } catch (error) {
      console.error("Error downloading transcript:", error)
      setError("Failed to download transcript")
      return Promise.reject(error)
    }
  }

  // Handler for downloading/generating summary
  const handleDownloadSummary = async () => {
    if (!lastCallID) {
      setError("No recent call found for this client")
      return
    }

    try {
      // First, check if summary exists by attempting to download it
      try {
        // Make a HEAD request to check if file exists
        await axios.head(`http://localhost:4000/api/download-file?callID=${lastCallID}&fileType=summary`)
        // If we get here, file exists, so download it
      } catch (err) {
        // If we get here, summary doesn't exist, so generate it
        console.log("Summary not found, generating now...")
        const generateResponse = await axios.get(`http://localhost:4000/api/generate-summary`, {
          params: { callID: lastCallID }
        })
        
        if (!generateResponse.data || generateResponse.status !== 200) {
          throw new Error("Failed to generate summary")
        }
        
        console.log("Summary generated successfully")
      }
      
      // Now download the summary (which should exist)
      const link = document.createElement('a')
      link.href = `http://localhost:4000/api/download-file?callID=${lastCallID}&fileType=summary`
      link.setAttribute('download', `summary_call_id_${lastCallID}.txt`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      return Promise.resolve()
    } catch (error) {
      console.error("Error generating/downloading summary:", error)
      setError("Failed to generate or download summary")
      return Promise.reject(error)
    }
  }

  if (isLoading) {
    return <ClientDetailsSkeleton />
  }

  if (!client) {
    return <ClientNotFound />
  }

  const completedTasks = client.tasks.filter((task) => task.completed).length
  const totalTasks = client.tasks.length

  return (
    <PageTransition>
      <div className="min-h-screen">
        <Navbar />

        <main className="container mx-auto px-4 py-8 pt-24">
          <div className="flex justify-between items-center mb-6">
            <ClientHeader name={client.name} company={client.company} />
            {/* <Button onClick={() => navigate("/clients")}>Back to Clients</Button> */}
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-800 text-white p-4 rounded-md mb-6">
              {error}
            </div>
          )}

          {/* Client Info and Last Call */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <ClientInfoCard 
              client={client} 
              completedTasks={completedTasks} 
              totalTasks={totalTasks} 
            />
            <CallNotesCard 
              clientName={client.name} 
              notes={client.lastCall?.notes || "No recent call notes available"}
              callID={lastCallID || undefined}
              onDownloadTranscript={lastCallID ? handleDownloadTranscript : undefined}
              onDownloadSummary={lastCallID ? handleDownloadSummary : undefined}
            />
          </div>

          <TasksList 
            tasks={client.tasks} 
            onToggleTask={handleToggleTask} 
          />

          {/* Analytics */}
          {!isLoadingAnalytics && (
            analytics.attention.length > 0 || 
            analytics.mood.length > 0 || 
            analytics.valueInternalization.length > 0 || 
            analytics.cognitiveResonance.length > 0
          ) && (
            <>
              <h3 className="text-2xl font-bold mb-4">Call Analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {analytics.attention.length > 0 && (
                  <AnalyticsChart
                    title="Attention Economics"
                    chartType="line"
                    data={analytics.attention}
                    dataKey="value"
                    xAxisKey="time"
                    color="#8b5cf6"
                  />
                )}
                {analytics.mood.length > 0 && (
                  <AnalyticsChart
                    title="Mood Induction"
                    chartType="line"
                    data={analytics.mood}
                    dataKey="value"
                    xAxisKey="time"
                    color="#06b6d4"
                  />
                )}
                {analytics.valueInternalization.length > 0 && (
                  <AnalyticsChart
                    title="Value Internalization"
                    chartType="area"
                    data={analytics.valueInternalization}
                    dataKey="value"
                    xAxisKey="time" 
                    color="#8b5cf6"
                  />
                )}
                {analytics.cognitiveResonance.length > 0 && (
                  <AnalyticsChart
                    title="Cognitive Resonance"
                    chartType="bar"
                    data={analytics.cognitiveResonance}
                    dataKey="value"
                    xAxisKey="time"
                    color="#06b6d4"
                  />
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </PageTransition>
  )
}

export default ClientDetailsPage

