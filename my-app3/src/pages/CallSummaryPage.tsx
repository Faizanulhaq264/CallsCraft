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

  // Prevent returning to active call via back button
  useEffect(() => {
    // Replace the current history entry
    window.history.replaceState(null, document.title, window.location.pathname);
    
    // Handle back button press
    const handlePopState = (event: PopStateEvent) => {
      // Prevent default navigation
      event.preventDefault();
      
      // Redirect to dashboard instead
      navigate("/dashboard", { replace: true });
    };
    
    // Add event listener
    window.addEventListener("popstate", handlePopState);
    
    // Cleanup
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [navigate]);

  const handleDownloadTranscript = async () => {
    try {
      setIsDownloadingTranscript(true);
      
      // Get callID from localStorage
      const storedCallData = localStorage.getItem("callData");
      if (!storedCallData) {
        console.error("No call data found in localStorage");
        setIsDownloadingTranscript(false);
        return;
      }
      
      const callData = JSON.parse(storedCallData);
      const callID = callData.callID;
      
      if (!callID) {
        console.error("No callID found in localStorage data");
        setIsDownloadingTranscript(false);
        return;
      }
      
      // Create a hidden a tag to trigger the download
      const link = document.createElement('a');
      link.href = `http://localhost:4000/api/download-file?callID=${callID}&fileType=transcript`;
      link.setAttribute('download', `transcript_call_id_${callID}.txt`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setIsDownloadingTranscript(false);
      setDownloadedTranscript(true);
    } catch (error) {
      console.error("Error downloading transcript:", error);
      setIsDownloadingTranscript(false);
    }
  };

  const handleDownloadSummary = async () => {
    try {
      setIsDownloadingSummary(true);
      
      // Get callID from localStorage
      const storedCallData = localStorage.getItem("callData");
      if (!storedCallData) {
        console.error("No call data found in localStorage");
        setIsDownloadingSummary(false);
        return;
      }
      
      const callData = JSON.parse(storedCallData);
      const callID = callData.callID;
      
      if (!callID) {
        console.error("No callID found in localStorage data");
        setIsDownloadingSummary(false);
        return;
      }
      
      // First generate the summary
      const generateResponse = await axios.get(`http://localhost:4000/api/generate-summary`, {
        params: { callID }
      });
      
      if (!generateResponse.data || generateResponse.status !== 200) {
        throw new Error("Failed to generate summary");
      }
      
      console.log("Summary generated successfully:", generateResponse.data.message);
      
      // Now download the generated summary
      const link = document.createElement('a');
      link.href = `http://localhost:4000/api/download-file?callID=${callID}&fileType=summary`;
      link.setAttribute('download', `summary_call_id_${callID}.txt`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setIsDownloadingSummary(false);
      setDownloadedSummary(true);
    } catch (error) {
      console.error("Error generating/downloading summary:", error);
      setIsDownloadingSummary(false);
    }
  };

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

          </div>
        </main>
      </div>
    </PageTransition>
  )
}

export default CallSummaryPage

