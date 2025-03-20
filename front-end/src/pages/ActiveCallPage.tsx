"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import Button from "../components/Button"
import Card from "../components/Card"
import Navbar from "../components/Navbar"
import PageTransition from "../components/PageTransition"
import Gauge from "../components/Gauge" // Import the Gauge component
import { ChevronDown, ChevronUp, Mic, MicOff, Phone } from "lucide-react"
import ZoomMtgEmbedded from "@zoom/meetingsdk/embedded";
import { useAuth } from "../context/AuthContext"; // Adjust import path as needed
import axios from "axios";
import { generateSignature, ZOOM_SDK_KEY, ZOOM_SDK_SECRET, startZoomBot, stopZoomBot } from "../utils/zoomUtils";

// Add a type definition for transcription entries
interface TranscriptionEntry {
  speaker: string;
  text: string;
  timestamp: string;
}

const ActiveCallPage = () => {
  // Add a ref for the transcription container
  const transcriptionContainerRef = useRef<HTMLDivElement>(null);
  
  // Create Zoom client instance
  const client = ZoomMtgEmbedded.createClient();
  
  const [isTranscriptionOpen, setIsTranscriptionOpen] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [callTime, setCallTime] = useState(0)
  const [notes, setNotes] = useState("")
  const [transcription, setTranscription] = useState<TranscriptionEntry[]>([]);
  const [gauges, setGauges] = useState({
    attentionEconomics: 50, // Start at neutral 50%
    moodInduction: 50,
    valueInternalization: 50,
    cognitiveResonance: 50,
  })
  const [participantCount, setParticipantCount] = useState(0);
  const [isBotJoinable, setIsBotJoinable] = useState(false);
  const [botActive, setBotActive] = useState(false);
  const [isBotJoining, setIsBotJoining] = useState(false);
  const [botUserId, setBotUserId] = useState<number | null>(null);
  const [botInMeeting, setBotInMeeting] = useState(false);
  const botRef = useRef<{ handler: ((payload: any) => void) | null }>({ handler: null });
  const navigate = useNavigate()
  const notesRef = useRef<HTMLTextAreaElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const gaugeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { currentUser } = useAuth();
  const [meetingCredentials, setMeetingCredentials] = useState({
    meetingNumber: "",
    password: ""
  });
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(true);
  const transcriptionSocketRef = useRef<WebSocket | null>(null);

  // Create refs to store your event handlers
  const userAddedRef = useRef<((payload: any) => void) | null>(null);
  const userRemovedRef = useRef<((payload: any) => void) | null>(null);

  // Keep track of whether processors have been started
  const processorsStartedRef = useRef<boolean>(false);

  // Add these imports and state variables
  const [lastFileContent, setLastFileContent] = useState<string>("");
  const [lastFileName, setLastFileName] = useState<string>("");
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize call data from localStorage
  const [callData, setCallData] = useState<{
    clientName: string
    accomplishments: string[]
  } | null>(null)

  const [hasRecordingPermission, setHasRecordingPermission] = useState(false);

  // Add these imports and state variables
  const [noteUpdateTimeout, setNoteUpdateTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isSavingNote, setIsSavingNote] = useState(false);

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
      
      // Register event handlers for participant tracking
      botRef.current.handler = (payload) => {
        console.log("New participant joined - checking for bot:", payload);
        
        // Check if payload is an array
        if (Array.isArray(payload)) {
          // Loop through all participants in the array
          for (let i = 0; i < payload.length; i++) {
            const participant = payload[i];
            if (participant && (participant.displayName === "ZOOMBOT" || participant.userName === "ZOOMBOT")) {
              console.log("Bot joined the meeting with ID:", participant.userId);
              setBotUserId(participant.userId);
              setBotInMeeting(true);
              setIsBotJoining(false); // Important: stop the joining state
              return; // Exit once we find the bot
            }
          }
        } else {
          // Handle the case where payload is a single participant
          if (payload && (payload.displayName === "ZOOMBOT" || payload.userName === "ZOOMBOT")) {
            console.log("Bot joined the meeting with ID:", payload.userId);
            setBotUserId(payload.userId);
            setBotInMeeting(true);
            setIsBotJoining(false); // Important: stop the joining state
          }
        }
      };
      
      // Add the handler
      client.on('user-added', botRef.current.handler);
      
      // Also handle bot removal
      client.on('user-removed', (payload) => {
        if (payload.userId === botUserId) {
          console.log("Bot left the meeting");
          setBotInMeeting(false);
          setBotUserId(null);
        }
      });

      // Add event listener for recording permission
      client.on('media-capture-permission-change', (payload) => {
        console.log('Recording permission change:', payload);
        if (payload.canRecord === true) {
          console.log('Recording permission granted!');
          setHasRecordingPermission(true);
          
          // Start gauge update interval
          if (!gaugeUpdateIntervalRef.current) {
            console.log('Starting gauge update interval');
            // First fetch immediately
            fetchGaugeData();
            // Then fetch every 15 seconds
            gaugeUpdateIntervalRef.current = setInterval(fetchGaugeData, 15000);
          }
        }
      });
      
      // Also listen for recording status changes
      client.on('local-recording-change', (payload) => {
        console.log('Local recording change:', payload);
        if (payload.userId === botUserId && payload.bLocalRecord === true) {
          console.log('Bot has started recording');
          // We could do additional actions here if needed
        }
      });
      
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

    // Focus on notes textarea
    if (notesRef.current) {
      notesRef.current.focus()
    }

    // Cleanup
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (gaugeUpdateIntervalRef.current) clearInterval(gaugeUpdateIntervalRef.current)
      
      // Remove event listeners if they were set
      try {
        if (userAddedRef.current) {
          client.off('user-added', userAddedRef.current);
        }
        if (userRemovedRef.current) {
          client.off('user-removed', userRemovedRef.current);
        }
        if (botRef.current.handler) {
          client.off('user-added', botRef.current.handler);
        }
      } catch (e) {
        console.error("Error removing event listeners:", e);
      }

      // Clear note update timeout
      if (noteUpdateTimeout) {
        clearTimeout(noteUpdateTimeout);
      }
    }
  }, [currentUser])

  // Add a function to parse the transcript file content
  const parseTranscriptContent = (content: string): TranscriptionEntry[] => {
    const entries: TranscriptionEntry[] = [];
    const lines = content.split('\n');
    
    // Skip the header lines (first 3 lines)
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and the end transcript line
      if (!line || line.startsWith('Transcript ended')) continue;
      
      // Parse the line: [YYYY-MM-DD HH:MM:SS] speaker: text
      const match = line.match(/\[(.+?)\] (.+?): (.+)/);
      if (match) {
        const [_, fullTimestamp, speaker, text] = match;
        // Extract just the time part (HH:MM:SS) from the full timestamp
        const timeOnly = fullTimestamp.split(' ')[1];
        
        entries.push({
          speaker: speaker,
          text: text,
          timestamp: timeOnly
        });
      }
    }
    
    return entries;
  };

  // Add a function to fetch the latest transcript
  const fetchLatestTranscript = async () => {
    try {
      const response = await axios.get('http://localhost:4000/api/latest-transcript');
      const { filename, content } = response.data;
      
      // If this is a new file or the content has changed
      if (filename !== lastFileName || content !== lastFileContent) {
        console.log('New transcript content detected');
        setLastFileName(filename);
        setLastFileContent(content);
        
        // Parse and update the transcription state
        const parsedEntries = parseTranscriptContent(content);
        setTranscription(parsedEntries);
      }
    } catch (error) {
      console.error('Error fetching transcript:', error);
    }
  };

  // Add useEffect to start/stop polling for transcript updates
  useEffect(() => {
    // Start polling when the bot is in the meeting
    if (botInMeeting) {
      console.log('Starting transcript polling');
      // Fetch immediately
      fetchLatestTranscript();
      
      // Then start polling every 2 seconds
      pollIntervalRef.current = setInterval(fetchLatestTranscript, 2000);
    }
    
    // Clean up function
    return () => {
      if (pollIntervalRef.current) {
        console.log('Stopping transcript polling');
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [botInMeeting, lastFileName, lastFileContent]);

  // Add cleanup for the poll interval in your component cleanup
  useEffect(() => {
    // ... your existing cleanup code ...
    
    return () => {
      // ... your existing cleanup code ...
      
      // Add this to clean up the poll interval
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Add this function to update notes with debounce
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNotes = e.target.value;
    setNotes(newNotes);
    
    // Clear existing timeout if there is one
    if (noteUpdateTimeout) {
      clearTimeout(noteUpdateTimeout);
    }
    
    // Set a new timeout to update the note after 5 seconds of inactivity
    const timeout = setTimeout(() => {
      updateNoteInDatabase(newNotes);
    }, 5000);
    
    setNoteUpdateTimeout(timeout);
  };

  // Function to send note update to the server
  const updateNoteInDatabase = async (content: string) => {
    // Get the active callID from localStorage
    let callID = null;
    const callDataString = localStorage.getItem("callData");
    
    if (callDataString) {
      try {
        const callData = JSON.parse(callDataString);
        callID = callData.callID;
      } catch (parseError) {
        console.error("Error parsing callData from localStorage:", parseError);
        return; // Exit if we can't get callID
      }
    }
    
    if (!callID) {
      console.warn("No active callID found, can't update note");
      return;
    }
    
    try {
      setIsSavingNote(true);
      
      const response = await axios.post('http://localhost:4000/api/update-note', {
        callID: callID,
        content: content
      });
      
      if (response.data) {
        console.log("Note updated successfully:", response.data);
      }
    } catch (error) {
      console.error("Error updating note:", error);
    } finally {
      setIsSavingNote(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleEndCall = async () => {
    try {
      // Update the note one last time before ending the call
      if (notes.trim()) {
        await updateNoteInDatabase(notes);
      }
      
      // Clear any pending timeout
      if (noteUpdateTimeout) {
        clearTimeout(noteUpdateTimeout);
        setNoteUpdateTimeout(null);
      }

      // If we have an active gauge update interval, clear it
      if (gaugeUpdateIntervalRef.current) {
        clearInterval(gaugeUpdateIntervalRef.current);
        gaugeUpdateIntervalRef.current = null;
      }

      // If bot is active, stop it
      if (botActive) {
        await stopZoomBot();
        
        // Also stop processors if PIDs are stored
        const pidsString = localStorage.getItem("processorPids");
        if (pidsString) {
          const pids = JSON.parse(pidsString);
          
          // Stop audio processor
          if (pids.audio) {
            await axios.post('http://localhost:4000/api/stop-processor', { pid: pids.audio });
          }
          
          // Stop video processor
          if (pids.video) {
            await axios.post('http://localhost:4000/api/stop-processor', { pid: pids.video });
          }
          
          // Clear stored PIDs
          localStorage.removeItem("processorPids");
        }
      }

      // Get the active callID from localStorage (from the callData object)
      let callID = null;
      const callDataString = localStorage.getItem("callData");
      
      if (callDataString) {
        try {
          const callData = JSON.parse(callDataString);
          callID = callData.callID;
        } catch (parseError) {
          console.error("Error parsing callData from localStorage:", parseError);
        }
      }
      
      if (callID) {
        // Call the end-call API endpoint to update the EndTime in the database
        try {
          const response = await axios.post('http://localhost:4000/api/end-call', { callID });
          console.log("Call ended in database:", response.data);
        } catch (endCallError) {
          console.error("Error ending call in database:", endCallError);
        }
      } else {
        console.warn("No active callID found, couldn't update call end time in database");
      }
      
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

  const handleJoinBot = async () => {
    console.log("Join Bot button clicked - starting Zoom bot");
    
    // Show loading state while bot is starting
    setIsBotJoining(true);
    
    try {
      // Start the Zoom bot with current meeting credentials
      const result = await startZoomBot(
        meetingCredentials.meetingNumber,
        meetingCredentials.password
      );
      
      if (result.success) {
        console.log("Zoom bot container started successfully");
        setBotActive(true);
        
        // Set up an event handler to check if bot has joined the meeting
        botRef.current.handler = (payload) => {
          console.log("New participant joined - checking for bot:", payload);
          
          // Check if payload is an array
          if (Array.isArray(payload)) {
            // Loop through all participants
            for (let i = 0; i < payload.length; i++) {
              const participant = payload[i];
              if (participant && (participant.displayName === "ZOOMBOT" || participant.userName === "ZOOMBOT")) {
                console.log("Bot joined the meeting with ID:", participant.userId);
                
                // Check if this is the first join or a reconnect with a different ID
                // The bot in "hold" state should not trigger processor start
                if (participant.bHold === true) {
                  console.log("Bot is in hold state, waiting for final admission");
                  continue;
                }
                
                setBotUserId(participant.userId);
                setBotInMeeting(true);
                setIsBotJoining(false);
                
                // Only start processors if they haven't been started yet
                if (!processorsStartedRef.current) {
                  console.log("Starting processors for the first time");
                  processorsStartedRef.current = true;
                  startProcessors();
                } else {
                  console.log("Processors already started, skipping duplicate start");
                }
                return;
              }
            }
          }
        };
        
        // Register the event handler
        client.on('user-added', botRef.current.handler);
        
      } else {
        setIsBotJoining(false);
        console.error("Failed to start Zoom bot");
      }
    } catch (error) {
      setIsBotJoining(false);
      console.error("Error starting Zoom bot:", error);
    }
  };

  // Add this new function to start processors
  const startProcessors = async () => {
    try {
      // First, check if we have existing processors running
      const pidsString = localStorage.getItem("processorPids");
      
      if (pidsString) {
        const pids = JSON.parse(pidsString);
        console.log("Found existing processors, stopping them first:", pids);
        
        // Stop audio processor
        if (pids.audio) {
          try {
            console.log(`Stopping audio processor with PID: ${pids.audio}`);
            await axios.post('http://localhost:4000/api/stop-processor', { pid: pids.audio });
            console.log(`Stopped audio processor with PID: ${pids.audio}`);
          } catch (error) {
            console.error(`Error stopping audio processor: ${error}`);
          }
        }
        
        // Stop video processor
        if (pids.video) {
          try {
            console.log(`Stopped video processor with PID: ${pids.video}`);
            await axios.post('http://localhost:4000/api/stop-processor', { pid: pids.video });
            console.log(`Stopped video processor with PID: ${pids.video}`);
          } catch (error) {
            console.error(`Error stopping video processor: ${error}`);
          }
        }
        
        // Give time for processes to fully terminate
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Get the transcript name from call data in localStorage
      let transcriptName = null;
      const callDataString = localStorage.getItem("callData");
      if (callDataString) {
        try {
          const callData = JSON.parse(callDataString);
          transcriptName = callData.transcriptName; // This comes from the start-call API response
          console.log("Using transcript name from call data:", transcriptName);
        } catch (parseError) {
          console.error("Error parsing callData from localStorage:", parseError);
        }
      }
      
      // Now start new processors with the transcript name
      const response = await axios.post('http://localhost:4000/api/start-processors', {
        transcriptName: transcriptName
      });
      
      if (response.data.success) {
        console.log("Audio and video processors started successfully:", response.data.pids);
        localStorage.setItem("processorPids", JSON.stringify(response.data.pids));
        processorsStartedRef.current = true;
      } else {
        console.error("Failed to start processors");
      }

      // After successfully starting processors, start gauge updates if we have recording permission
      if (hasRecordingPermission && !gaugeUpdateIntervalRef.current) {
        console.log('Starting gauge updates after processors');
        fetchGaugeData(); // Initial fetch
        gaugeUpdateIntervalRef.current = setInterval(fetchGaugeData, 15000);
      }
    } catch (error) {
      console.error("Error starting processors:", error);
    }
  };

  const checkForBot = () => {
    try {
      const participants = client.getAttendeeslist();
      console.log("Checking for bot in current participants:", participants);
      
      if (participants && participants.length > 0) {
        for (const p of participants) {
          if (p.displayName === "ZOOMBOT" || p.userName === "ZOOMBOT") {
            console.log("Found bot in current participants with ID:", p.userId);
            setBotUserId(p.userId);
            setBotInMeeting(true);
            setIsBotJoining(false);
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      console.error("Error checking for bot:", error);
      return false;
    }
  };

  // Add a function to fetch gauge data from the backend
  const fetchGaugeData = async () => {
    try {
      // Get the active callID from localStorage
      let callID = null;
      const callDataString = localStorage.getItem("callData");
      
      if (callDataString) {
        try {
          const callData = JSON.parse(callDataString);
          callID = callData.callID;
        } catch (parseError) {
          console.error("Error parsing callData from localStorage:", parseError);
          return; // Exit if we can't get callID
        }
      }
      
      if (!callID) {
        console.warn("No active callID found, can't fetch gauge data");
        return;
      }
      
      // Get the last update timestamp, or null for first fetch
      const lastUpdateTimestamp = localStorage.getItem("lastGaugeUpdate") || null;
      
      // Call the API endpoint
      const response = await axios.get('http://localhost:4000/api/get-scores', {
        params: {
          callID: callID,
          timestamp: lastUpdateTimestamp
        }
      });
      
      if (response.data) {
        console.log("Received gauge data:", response.data);
        
        // Update the gauges state with real data
        setGauges({
          attentionEconomics: response.data.attentionEconomics,
          moodInduction: response.data.moodInduction,
          valueInternalization: response.data.valueInternalization,
          cognitiveResonance: response.data.cognitiveResonance
        });
        
        // Save the current timestamp for next fetch
        localStorage.setItem("lastGaugeUpdate", response.data.timestamp);
      }
    } catch (error) {
      console.error("Error fetching gauge data:", error);
    }
  };

  // Prevent returning to this page via back button
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
                  onChange={handleNotesChange}
                ></textarea>
                {isSavingNote && (
                  <div className="absolute bottom-3 right-3 text-xs text-gray-500">
                    Saving...
                  </div>
                )}
              </Card>

              {/* Transcription */}
              <Card>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xl font-bold">
                    Live Transcription {transcription.length > 0 ? `(${transcription.length})` : ""}
                  </h3>
                  <button
                    onClick={() => setIsTranscriptionOpen(!isTranscriptionOpen)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {isTranscriptionOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>

                <div 
                  className={`transition-all duration-300 ease-in-out ${
                    isTranscriptionOpen ? "max-h-96" : "max-h-0 opacity-0"
                  }`}
                >
                  <div 
                    ref={transcriptionContainerRef}
                    className="pr-2 space-y-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900 pb-2"
                  >
                    {transcription.length === 0 ? (
                      <p className="text-gray-400 text-center py-4">No transcriptions yet</p>
                    ) : (
                      transcription.map((entry, index) => (
                        <div key={`transcript-${index}`} className="pb-3 border-b border-gray-800 last:border-0">
                          <div className="flex justify-between items-center mb-1">
                            <span
                              className={`font-medium ${entry.speaker === "host" || entry.speaker === "Host" ? "text-purple-500" : "text-cyan-500"}`}
                            >
                              {entry.speaker.charAt(0).toUpperCase() + entry.speaker.slice(1)}
                            </span>
                            <span className="text-xs text-gray-500">{entry.timestamp}</span>
                          </div>
                          <p className="text-gray-300">{entry.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </Card>

              {/* Gauges */}
              <Card>
                <h3 className="text-xl font-bold mb-4">Client Metrics</h3>
                <div className="flex justify-between items-center">
                  <Gauge label="Attention" value={Math.round(gauges.attentionEconomics)} color="purple" />
                  <Gauge label="Mood" value={Math.round(gauges.moodInduction)} color="cyan" />
                  <Gauge label="Value" value={Math.round(gauges.valueInternalization)} color="purple" />
                  <Gauge label="Resonance" value={Math.round(gauges.cognitiveResonance)} color="cyan" />
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
                        className={`text-sm ${
                          botInMeeting 
                            ? 'bg-green-600 hover:bg-green-700'  // Bot is in the meeting 
                            : botActive 
                              ? 'bg-yellow-600 hover:bg-yellow-700' // Container running but bot not in meeting yet
                              : isBotJoinable 
                                ? 'bg-purple-600 hover:bg-purple-700' // Can start the bot
                                : 'bg-gray-700 text-gray-400 cursor-not-allowed' // Can't start the bot
                        }`}
                        disabled={!isBotJoinable || botActive || botInMeeting || isBotJoining}
                      >
                        {botInMeeting ? "Bot Active" : botActive ? "Bot Starting" : isBotJoining ? "Joining..." : "Join Bot"}
                      </Button>
                      
                      {/* Tooltip that appears on hover when button is disabled */}
                      {!isBotJoinable && !botActive && (
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

