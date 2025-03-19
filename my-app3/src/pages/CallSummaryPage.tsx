"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Button from "../components/Button"
import Card from "../components/Card"
import Navbar from "../components/Navbar"
import PageTransition from "../components/PageTransition"
import { Download, FileText, FileDown, Check, Clock, XCircle } from "lucide-react"
import axios from "axios"

const CallSummaryPage = () => {
  const [callData, setCallData] = useState<{
    clientName: string
    accomplishments: string[]
    timestamp: string
  } | null>(null)
  const [transcription, setTranscription] = useState<any[]>([])
  const [isDownloadingTranscript, setIsDownloadingTranscript] = useState(false)
  const [isDownloadingSummary, setIsDownloadingSummary] = useState(false)
  const [downloadedTranscript, setDownloadedTranscript] = useState(false)
  const [downloadedSummary, setDownloadedSummary] = useState(false)
  const [tasks, setTasks] = useState<{goal: string, status: boolean}[]>([])
  const [accomplishmentsAnalyzed, setAccomplishmentsAnalyzed] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [incompleteTasks, setIncompleteTasks] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const navigate = useNavigate()

  const fetchTasksForCall = async (callID: number) => {
    try {
      const response = await axios.get(`http://localhost:4000/api/tasks`, {
        params: { callID }
      });
      setTasks(response.data.tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const fetchAccomplishmentAnalysis = async (callID: number) => {
    try {
      setIsAnalyzing(true);
      
      const response = await axios.get(`http://localhost:4000/api/analyze-accomplishments`, {
        params: { callID }
      });
      
      if (response.data) {
        setCompletedTasks(response.data.completed || []);
        setIncompleteTasks(response.data.incomplete || []);
        setAccomplishmentsAnalyzed(true);
      }
    } catch (error) {
      console.error("Error analyzing accomplishments:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    // Get call data from localStorage
    const storedCallData = localStorage.getItem("callData")
    if (storedCallData) {
      const parsedData = JSON.parse(storedCallData);
      setCallData(parsedData);
      
      // Fetch tasks from database if we have a callID
      if (parsedData.callID) {
        fetchTasksForCall(parsedData.callID);
        fetchAccomplishmentAnalysis(parsedData.callID);
      }
    }

    // Get transcription from localStorage
    const storedTranscription = localStorage.getItem("transcription")
    if (storedTranscription) {
      setTranscription(JSON.parse(storedTranscription))
    }
  }, [])

  const handleDownloadTranscript = () => {
    setIsDownloadingTranscript(true)

    // Simulate download delay
    setTimeout(() => {
      // Format transcription for download
      const formattedTranscript = transcription
        .map((entry) => `[${entry.timestamp}] ${entry.speaker}: ${entry.text}`)
        .join("\n\n")

      // Create download link
      const element = document.createElement("a")
      const file = new Blob([formattedTranscript], { type: "text/plain" })
      element.href = URL.createObjectURL(file)
      element.download = `call-transcript-${new Date().toISOString().slice(0, 10)}.txt`
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)

      setIsDownloadingTranscript(false)
      setDownloadedTranscript(true)
    }, 2000)
  }

  const handleDownloadSummary = () => {
    setIsDownloadingSummary(true)

    // Simulate download delay and summary generation
    setTimeout(() => {
      // Create a mock summary
      const summary = `
Call Summary with ${callData?.clientName}
Date: ${new Date(callData?.timestamp || "").toLocaleString()}
Duration: 25 minutes

Key Points:
- Discussed project progress and current development phase
- Addressed resource allocation challenges
- Created action plan for timeline management
- Reviewed upcoming milestones and deliverables

Action Items:
- Schedule follow-up meeting with project team
- Share resource allocation document
- Update project timeline by end of week

Accomplishments:
${callData?.accomplishments.map((a) => `- ${a}`).join("\n")}
      `

      // Create download link
      const element = document.createElement("a")
      const file = new Blob([summary], { type: "text/plain" })
      element.href = URL.createObjectURL(file)
      element.download = `call-summary-${new Date().toISOString().slice(0, 10)}.txt`
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)

      setIsDownloadingSummary(false)
      setDownloadedSummary(true)
    }, 3500)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  return (
    <PageTransition>
      <div className="min-h-screen">
        <Navbar />

        <main className="container mx-auto px-4 py-8 pt-24">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold">Call Summary</h2>
                <p className="text-gray-400 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {callData?.timestamp ? formatDate(callData.timestamp) : "Recent call"}
                </p>
              </div>
              <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-500" />
                  Call with {callData?.clientName || "Client"}
                </h3>
                <p className="text-gray-400 mb-4">Review your call accomplishments and download resources.</p>
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                  <h4 className="text-md font-medium mb-2 flex items-center justify-between">
                    <span>Planned Accomplishments:</span>
                    {isAnalyzing && (
                      <span className="text-xs text-gray-500 flex items-center">
                        <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white mr-2"></div>
                        Analyzing...
                      </span>
                    )}
                  </h4>
                  
                  {accomplishmentsAnalyzed ? (
                    <div className="space-y-4">
                      {completedTasks.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-green-500 flex items-center gap-1 mb-2">
                            <Check className="h-4 w-4" /> Completed
                          </h5>
                          <ul className="list-disc pl-5 space-y-1">
                            {completedTasks.map((task, index) => (
                              <li key={`completed-${index}`} className="text-gray-300">
                                {task}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {incompleteTasks.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-red-500 flex items-center gap-1 mb-2">
                            <XCircle className="h-4 w-4" /> Not Completed
                          </h5>
                          <ul className="list-disc pl-5 space-y-1">
                            {incompleteTasks.map((task, index) => (
                              <li key={`incomplete-${index}`} className="text-gray-300">
                                {task}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {completedTasks.length === 0 && incompleteTasks.length === 0 && (
                        <p className="text-gray-500 italic">Analysis complete, but could not determine task status.</p>
                      )}
                    </div>
                  ) : (
                    <>
                      {callData?.accomplishments && callData.accomplishments.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-1">
                          {callData.accomplishments.map((item, index) => (
                            <li key={index} className="text-gray-300">
                              {item}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500 italic">No accomplishments were set for this call.</p>
                      )}
                    </>
                  )}
                </div>
              </Card>

              <Card>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <FileDown className="h-5 w-5 text-cyan-500" />
                  Download Resources
                </h3>
                <p className="text-gray-400 mb-4">
                  Download the call transcription or a generated summary of the conversation.
                </p>
                <div className="space-y-4">
                  <div className="flex flex-col">
                    <Button
                      onClick={handleDownloadTranscript}
                      disabled={isDownloadingTranscript || downloadedTranscript}
                      className="flex items-center justify-center gap-2"
                    >
                      {isDownloadingTranscript ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                          Downloading Transcript...
                        </>
                      ) : downloadedTranscript ? (
                        <>
                          <Check className="h-5 w-5" />
                          Transcript Downloaded
                        </>
                      ) : (
                        <>
                          <Download className="h-5 w-5" />
                          Download Full Transcript
                        </>
                      )}
                    </Button>
                    <span className="text-xs text-gray-500 mt-1 text-center">
                      Raw transcript of the entire conversation
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <Button
                      onClick={handleDownloadSummary}
                      disabled={isDownloadingSummary || downloadedSummary}
                      variant="secondary"
                      className="flex items-center justify-center gap-2"
                    >
                      {isDownloadingSummary ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                          Generating Summary...
                        </>
                      ) : downloadedSummary ? (
                        <>
                          <Check className="h-5 w-5" />
                          Summary Downloaded
                        </>
                      ) : (
                        <>
                          <FileText className="h-5 w-5" />
                          Download AI Summary
                        </>
                      )}
                    </Button>
                    <span className="text-xs text-gray-500 mt-1 text-center">
                      AI-generated summary with key points and action items
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            <Card>
              <h3 className="text-xl font-bold mb-4">Transcription Preview</h3>
              {transcription.length > 0 ? (
                <div className="max-h-96 overflow-y-auto pr-2 space-y-4">
                  {transcription.slice(0, 10).map((entry, index) => (
                    <div key={index} className="pb-3 border-b border-gray-800 last:border-0">
                      <div className="flex justify-between items-center mb-1">
                        <span
                          className={`font-medium ${entry.speaker === "You" ? "text-purple-500" : "text-cyan-500"}`}
                        >
                          {entry.speaker}
                        </span>
                        <span className="text-xs text-gray-500">{entry.timestamp}</span>
                      </div>
                      <p className="text-gray-300">{entry.text}</p>
                    </div>
                  ))}
                  {transcription.length > 10 && (
                    <p className="text-center text-gray-500 italic">
                      ... and {transcription.length - 10} more entries. Download the full transcript to see all.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 italic">No transcription available for this call.</p>
              )}
            </Card>
          </div>
        </main>
      </div>
    </PageTransition>
  )
}

export default CallSummaryPage

