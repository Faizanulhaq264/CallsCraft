"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import Button from "../components/Button"
import Card from "../components/Card"
import Navbar from "../components/Navbar"
import PageTransition from "../components/PageTransition"
import { ChevronDown, ChevronUp, Mic, MicOff, Phone } from "lucide-react"

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
  const navigate = useNavigate()
  const notesRef = useRef<HTMLTextAreaElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const gaugeTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize call data from localStorage
  const [callData, setCallData] = useState<{
    clientName: string
    accomplishments: string[]
  } | null>(null)

  useEffect(() => {
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

    // Cleanup
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (gaugeTimerRef.current) clearInterval(gaugeTimerRef.current)
      clearInterval(transcriptionInterval)
    }
  }, [])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleEndCall = () => {
    // Store transcription in localStorage
    localStorage.setItem("transcription", JSON.stringify(transcription))

    // Navigate to call summary page
    navigate("/call-summary")
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

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

                {isTranscriptionOpen && (
                  <div className="max-h-96 overflow-y-auto pr-2 space-y-4">
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
                )}
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

            {/* Right column - Zoom interface */}
            <div className="lg:col-span-1">
              <Card className="h-full min-h-[600px] flex items-center justify-center">
                <div className="text-center">
                  <div className="bg-gray-800 rounded-lg p-8 mb-4">
                    <div className="w-32 h-32 bg-gray-700 rounded-full mx-auto flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-16 w-16 text-gray-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-xl font-medium mb-2">Zoom Interface</h3>
                  <p className="text-gray-400 mb-4">Your custom Zoom interface will be integrated here.</p>
                  <div className="text-sm text-gray-500">Placeholder for Zoom SDK integration</div>
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

