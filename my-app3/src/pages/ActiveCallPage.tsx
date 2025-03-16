"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import Button from "../components/Button"
import Card from "../components/Card"
import Navbar from "../components/Navbar"
import PageTransition from "../components/PageTransition"
import { ChevronDown, ChevronUp, Mic, MicOff, Phone } from "lucide-react"
import ZoomMtgEmbedded from "@zoom/meetingsdk/embedded";
import { useAuth } from "../context/AuthContext"; // Adjust import path as needed
import axios from "axios";
import { generateSignature, ZOOM_SDK_KEY, ZOOM_SDK_SECRET } from "../utils/zoomUtils";

// Mock transcription data
const mockTranscription = [
  { speaker: "You", text: "Hello, how are you doing today?", timestamp: "00:00:15" },
  { speaker: "Client", text: "I'm doing well, thank you for asking.", timestamp: "00:00:18" },
  { speaker: "You", text: "Great! Let's talk about your goals for today's session.", timestamp: "00:00:22" },
  {
    speaker: "Client",
    text: "I'd like to discuss the progress on the project and any challenges I'm facing.",
    timestamp: "00:00:30",
  },
  { speaker: "You", text: "That sounds good. Let's start with the progress update.", timestamp: "00:00:35" },
  {
    speaker: "Client",
    text: "We've completed the initial phase and are now moving into development.",
    timestamp: "00:00:42",
  },
  { speaker: "You", text: "That's excellent progress. What challenges are you encountering?", timestamp: "00:00:50" },
  {
    speaker: "Client",
    text: "We're having some issues with resource allocation and timeline management.",
    timestamp: "00:00:58",
  },
  {
    speaker: "You",
    text: "I understand. Let's break down those challenges and address them one by one.",
    timestamp: "00:01:10",
  },
]

// Gauge component
const Gauge = ({ label, value, color }: { label: string; value: number; color: string }) => {
  // Calculate the angle for the gauge needle
  const angle = (value / 100) * 180 - 90

  return (
    <div className="flex flex-col items-center">
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div className="relative w-24 h-12 overflow-hidden">
        <div className="absolute w-24 h-24 bottom-0 rounded-full border-4 border-gray-800"></div>
        <div
          className={`absolute w-24 h-24 bottom-0 rounded-full border-4 border-transparent border-t-${color}-500`}
          style={{
            transform: `rotate(${angle}deg)`,
            borderTopColor: `var(--${color}-500, #8b5cf6)`, // Fallback to purple
          }}
        ></div>
        <div className="absolute inset-0 flex items-center justify-center bottom-1">
          <span className="text-lg font-bold">{value}%</span>
        </div>
      </div>
    </div>
  )
}

const ActiveCallPage = () => {
  // Create Zoom client instance
  const client = ZoomMtgEmbedded.createClient();
  
  const [isTranscriptionOpen, setIsTranscriptionOpen] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [callTime, setCallTime] = useState(0)
  const [notes, setNotes] = useState("")
  const [transcription, setTranscription] = useState(mockTranscription)
  const [gauges, setGauges] = useState({
    mood: 75,
    focus: 85,
    attention: 90,
    balance: 70,
  })
  const [participantCount, setParticipantCount] = useState(0);
  const [isBotJoinable, setIsBotJoinable] = useState(false);
  const navigate = useNavigate()
  const notesRef = useRef<HTMLTextAreaElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const gaugeTimerRef = useRef<NodeJS.Timeout | null>(null)
  const { currentUser } = useAuth();
  const [meetingCredentials, setMeetingCredentials] = useState({
    meetingNumber: "",
    password: ""
  });
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(true);

  // Create refs to store your event handlers
  const userAddedRef = useRef<((payload: any) => void) | null>(null);
  const userRemovedRef = useRef<((payload: any) => void) | null>(null);

  // Initialize call data from localStorage
  const [callData, setCallData] = useState<{
    clientName: string
    accomplishments: string[]
  } | null>(null)

  async function startMeeting() {
    // Don't proceed if credentials aren't loaded yet
    if (isLoadingCredentials || !meetingCredentials.meetingNumber) {
      console.error("Meeting credentials not loaded yet");
      return;
    }

    const meetingSDKElement = document.getElementById("zoomMeetingSDKElement")!;
    
    try {
      console.log("Initializing client...");
      await client.init({
        zoomAppRoot: meetingSDKElement,
        language: "en-US",
        customize:{
          video:{
            isResizable: false,
            viewSizes:{
              default: {
                width: 300,  // Adjusted to fit card
                height: 750  // Adjusted to fit card
              }
            },
            popper:{
              disableDraggable: true
            }
          }
        },
        patchJsMedia: true,
        leaveOnPageUnload: true,
      });
      
      console.log("Client initialized, attempting to join...");
      
      // Generate a dynamic signature for this meeting
      const signature = generateSignature(
        ZOOM_SDK_KEY,
        ZOOM_SDK_SECRET,
        meetingCredentials.meetingNumber,
        1 // Role 1 for host
      );
      console.log("Signature: ", signature)
      await client.join({
        signature: signature,
        sdkKey: ZOOM_SDK_KEY,
        meetingNumber: meetingCredentials.meetingNumber,
        password: meetingCredentials.password,
        userName: currentUser.name || "User",
        userEmail: currentUser.email || '',
        tk: '',
        zak: '',
      });
      console.log("Joined successfully");
      
      // Create the event handlers and store references
      userAddedRef.current = (payload) => {
        console.log('New participant joined', payload);
        updateParticipantCount();
      };
      
      userRemovedRef.current = (payload) => {
        console.log('Participant left', payload);
        updateParticipantCount();
      };
      
      // Register event handlers using the stored references
      client.on('user-added', userAddedRef.current);
      client.on('user-removed', userRemovedRef.current);
      
      // Initial participant count check
      setTimeout(updateParticipantCount, 2000); // Give time for attendance list to populate
      
    } catch (error) {
      console.error("Error in Zoom meeting:", error);
    }
  }

  const fetchMeetingCredentials = async () => {
    try {
      setIsLoadingCredentials(true);
      const response = await axios.get(`${'http://localhost:4000'}/api/meeting-credentials/${currentUser.id}`);
      setMeetingCredentials(response.data);
      setIsLoadingCredentials(false);
    } catch (error) {
      console.error("Error fetching meeting credentials:", error);
      setIsLoadingCredentials(false);
    }
  };

  useEffect(() => {
    // Fetch credentials when component mounts
    if (currentUser) {
      fetchMeetingCredentials();
    }
    
    // Get call data from localStorage
    const storedCallData = localStorage.getItem("callData")
    if (storedCallData) {
      setCallData(JSON.parse(storedCallData))
    }

    // Start call timer
    timerRef.current = setInterval(() => {
      setCallTime((prev) => prev + 1)
    }, 1000)

    // Simulate changing gauge values
    gaugeTimerRef.current = setInterval(() => {
      setGauges((prev) => ({
        mood: Math.min(100, Math.max(0, prev.mood + (Math.random() * 10 - 5))),
        focus: Math.min(100, Math.max(0, prev.focus + (Math.random() * 10 - 5))),
        attention: Math.min(100, Math.max(0, prev.attention + (Math.random() * 10 - 5))),
        balance: Math.min(100, Math.max(0, prev.balance + (Math.random() * 10 - 5))),
      }))
    }, 5000)

    // Simulate adding to transcription
    const transcriptionInterval = setInterval(() => {
      const newEntry = {
        speaker: Math.random() > 0.5 ? "You" : "Client",
        text: "This is a simulated transcription entry for demonstration purposes.",
        timestamp: formatTime(callTime),
      }
      setTranscription((prev) => [...prev, newEntry])
    }, 15000)

    // Focus on notes textarea
    if (notesRef.current) {
      notesRef.current.focus()
    }

    // Automatically start the Zoom meeting when component mounts
    // startMeeting();

    // Cleanup
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (gaugeTimerRef.current) clearInterval(gaugeTimerRef.current)
      clearInterval(transcriptionInterval)
      
      // Remove event listeners if they were set
      try {
        if (userAddedRef.current) {
          client.off('user-added', userAddedRef.current);
        }
        if (userRemovedRef.current) {
          client.off('user-removed', userRemovedRef.current);
        }
      } catch (e) {
        console.error("Error removing event listeners:", e);
      }
    }
  }, [currentUser])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleEndCall = async () => {
    try {
      // If you're the host and want to end for everyone
      if (currentUser.isHost) {
        await client.endMeeting();
      } else {
        // If you're just a participant
        await client.leaveMeeting();
      }
      
      console.log("Successfully left/ended the meeting");
      
      // Clean up the Zoom client
      ZoomMtgEmbedded.destroyClient();
      
      // Store transcription in localStorage
      localStorage.setItem("transcription", JSON.stringify(transcription));
      
      // Navigate to call summary page
      navigate("/call-summary");
    } catch (error) {
      console.error("Error during meeting cleanup:", error);
      
      // Still try to destroy the client even if meeting end failed
      try {
        ZoomMtgEmbedded.destroyClient();
      } catch (cleanupError) {
        console.error("Failed to destroy Zoom client:", cleanupError);
      }
      
      // Continue with navigation anyway
      localStorage.setItem("transcription", JSON.stringify(transcription));
      navigate("/call-summary");
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const updateParticipantCount = () => {
    try {
      const participants = client.getAttendeeslist();
      const count = participants ? participants.length : 0;
      console.log(`Current participant count: ${count}`);
      setParticipantCount(count);
      
      // Bot is joinable when exactly 2 participants (host + client)
      setIsBotJoinable(count === 2);
    } catch (error) {
      console.error("Error getting participant list:", error);
      setParticipantCount(0);
      setIsBotJoinable(false);
    }
  };

  const handleJoinBot = () => {
    console.log("Join Bot button clicked - functionality to be implemented");
    // Implementation will come later
  };

  return (
    <PageTransition>
      <div className="min-h-screen">
        <Navbar />

        <main className="container mx-auto px-4 py-8 pt-24">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-3xl font-bold">Call with {callData?.clientName || "Client"}</h2>
              <p className="text-gray-400">Duration: {formatTime(callTime)}</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant={isMuted ? "primary" : "secondary"}
                onClick={toggleMute}
                className="flex items-center gap-2"
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                {isMuted ? "Unmute" : "Mute"}
              </Button>
              <Button
                variant="secondary"
                onClick={handleEndCall}
                className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
              >
                <Phone className="h-5 w-5" />
                End Call
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column - Notes and Transcription */}
            <div className="lg:col-span-2 space-y-6">
              {/* Notes */}
              <Card className="h-64">
                <h3 className="text-xl font-bold mb-3">Notes</h3>
                <textarea
                  ref={notesRef}
                  className="w-full h-[calc(100%-3rem)] bg-gray-900 border border-gray-800 rounded-md p-3 text-white resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Take notes here..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                ></textarea>
              </Card>

              {/* Transcription */}
              <Card>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xl font-bold">Live Transcription</h3>
                  <button
                    onClick={() => setIsTranscriptionOpen(!isTranscriptionOpen)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {isTranscriptionOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>

                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isTranscriptionOpen ? "max-h-96" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="pr-2 space-y-4">
                    {transcription.map((entry, index) => (
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
                  </div>
                </div>
              </Card>

              {/* Gauges */}
              <Card>
                <h3 className="text-xl font-bold mb-4">Client Metrics</h3>
                <div className="flex justify-between items-center">
                  <Gauge label="Mood" value={Math.round(gauges.mood)} color="purple" />
                  <Gauge label="Focus" value={Math.round(gauges.focus)} color="cyan" />
                  <Gauge label="Attention" value={Math.round(gauges.attention)} color="purple" />
                  <Gauge label="Balance" value={Math.round(gauges.balance)} color="cyan" />
                </div>
              </Card>
            </div>

            {/* Right column - Zoom interface - with position fixed */}
            <div className="lg:col-span-1">
              <Card className="h-full min-h-[600px] flex flex-col lg:sticky lg:top-24">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-medium">Zoom Interface</h3>
                  <div className="flex space-x-2 items-center">
                    <Button
                      variant="secondary"
                      onClick={startMeeting}
                      className="text-sm"
                      disabled={isLoadingCredentials}
                    >
                      {isLoadingCredentials ? "Loading..." : "Connect"}
                    </Button>
                    
                    {/* Join Bot button with tooltip */}
                    <div className="relative group">
                      <Button
                        variant="secondary"
                        onClick={handleJoinBot}
                        className={`text-sm ${isBotJoinable ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}
                        disabled={!isBotJoinable}
                      >
                        Join Bot
                      </Button>
                      
                      {/* Tooltip that appears on hover when button is disabled */}
                      {!isBotJoinable && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-xs text-white rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                          {participantCount < 2 ? "Available with 2 Participants" : participantCount > 2 ? "Too many participants" : ""}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div 
                  id="zoomMeetingSDKElement" 
                  className="flex-grow bg-[#242424] rounded-lg overflow-hidden"
                  style={{ height: "835px" }}
                >
                  {isLoadingCredentials && (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-400">Loading meeting credentials...</p>
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1 text-right">
                  {participantCount > 0 ? `${participantCount} participants` : "Not connected"}
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </PageTransition>
  )
}

export default ActiveCallPage

