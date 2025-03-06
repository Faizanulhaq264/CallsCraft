import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import { WebSocketServer } from 'ws';

import pkg from 'wavefile';
const { WaveFile } = pkg;

// Initialize Deepgram
const deepgram = createClient("d7ce2e3f6336e4d41ab55e54023ebdb03b74f4fd");

// Create separate live transcription instances for host and client
const hostLive = deepgram.listen.live({ 
    model: "nova-2",  
    encoding: "wav"
});

const clientLive = deepgram.listen.live({ 
    model: "nova-2",  
    encoding: "wav"
});

// Handle Deepgram events for host stream
hostLive.on(LiveTranscriptionEvents.Open, () => {
    console.log("Host Stream: Connected to Deepgram");
});

hostLive.on(LiveTranscriptionEvents.Transcript, (data) => {
    const transcript = data.channel.alternatives[0].transcript;

    console.log("Inside the hostTranscription function==> ",transcript);
    // if (transcript.trim()) {
        console.log(`\nHost [${new Date().toLocaleTimeString()}]: ${transcript}`);
    // }
});

hostLive.on(LiveTranscriptionEvents.Error, (error) => {
    console.error("Host Stream Error:", error);
});

// Handle Deepgram events for client stream
clientLive.on(LiveTranscriptionEvents.Open, () => {
    console.log("Client Stream: Connected to Deepgram");
});

clientLive.on(LiveTranscriptionEvents.Transcript, (data) => {
    const transcript = data.channel.alternatives[0].transcript;
    if (transcript.trim()) {
        console.log(`\nClient [${new Date().toLocaleTimeString()}]: ${transcript}`);
    }
});

clientLive.on(LiveTranscriptionEvents.Error, (error) => {
    console.error("Client Stream Error:", error);
});

// WebSocket server to receive audio stream
const wss = new WebSocketServer({ port: 8086 });

function convertToWav(pcmData) {
    const wav = new WaveFile();
    
    // Create WAV from PCM data
    wav.fromScratch(1, // Number of channels
                    32000, // Sample rate
                    '16', // Bit depth
                    pcmData); // PCM data
    
    return wav.toBuffer();
}

wss.on("connection", (ws) => {
    console.log("Client connected, receiving audio stream");

    ws.on("message", (message) => {
        try {
            // The first byte indicates if it's host (1) or client (0)
            const isHost = message[0] === 1;
            
            // Skip the first byte and ensure proper alignment
            const audioData = Buffer.alloc(message.length - 1);
            message.copy(audioData, 0, 1);
            
            // Convert PCM to WAV
            const wavData = convertToWav(audioData);
            
            console.log(`Sending ${wavData.length} bytes of WAV data to Deepgram for ${isHost ? 'Host' : 'Client'}`);
            
            if (isHost) {
                hostLive.send(wavData);
            } else {
                clientLive.send(wavData);
            }
        } catch (error) {
            console.error("Error processing audio data:", error);
            console.error("Message length:", message.length);
            console.error("First few bytes:", Array.from(message.slice(0, 10)));
        }
    });

    ws.on("close", () => {
        console.log("Client disconnected");
    });
});

// Close Deepgram connections when needed
function closeDeepgram() {
    hostLive.requestClose();
    clientLive.requestClose();
    console.log("Deepgram connections closed");
}

process.on("SIGINT", () => {
    closeDeepgram();
    process.exit();
});
  