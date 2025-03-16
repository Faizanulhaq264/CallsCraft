from signal import SIGINT, SIGTERM
import asyncio
from dotenv import load_dotenv
import websockets
import json
import base64
import logging
from deepgram.utils import verboselogs
from time import sleep
from datetime import datetime
import os
import aiohttp
from typing import Dict, List
import websockets.server

from deepgram import (
    DeepgramClient,
    DeepgramClientOptions,
    LiveTranscriptionEvents,
    LiveOptions,
)

# load_dotenv()

class TranscriptionPipeline:
    def __init__(self, source_type):
        self.source_type = source_type  # "host" or "client"
        self.is_finals = []
        self.dg_connection = None
        self.transcript_file = None
        self.session = None
        self.sentiment_websocket = None
        
    def get_timestamp(self):
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
    def write_to_transcript(self, utterance):
        timestamp = self.get_timestamp()
        line = f"[{timestamp}] {self.source_type}: {utterance}\n"
        with open(self.transcript_file, 'a', encoding='utf-8') as f:
            f.write(line)
            f.flush()  # Ensure the line is written immediately
        
    async def initialize(self, api_key, transcript_file, sentiment_websocket):
        self.transcript_file = transcript_file
        self.sentiment_websocket = sentiment_websocket
        config = DeepgramClientOptions(options={"keepalive": "true"})
        deepgram = DeepgramClient(api_key, config)
        self.dg_connection = deepgram.listen.asyncwebsocket.v("1")
        
        # Set up event handlers
        self.dg_connection.on(LiveTranscriptionEvents.Open, self.on_open)
        self.dg_connection.on(LiveTranscriptionEvents.Transcript, self.on_message)
        self.dg_connection.on(LiveTranscriptionEvents.Metadata, self.on_metadata)
        self.dg_connection.on(LiveTranscriptionEvents.SpeechStarted, self.on_speech_started)
        self.dg_connection.on(LiveTranscriptionEvents.UtteranceEnd, self.on_utterance_end)
        self.dg_connection.on(LiveTranscriptionEvents.Close, self.on_close)
        self.dg_connection.on(LiveTranscriptionEvents.Error, self.on_error)
        
        options = LiveOptions(
            model="nova-3",
            language="en-US",
            smart_format=True,
            encoding="linear16",
            channels=1,
            sample_rate=32000,
            interim_results=True,
            utterance_end_ms="1000",
            vad_events=True,
            endpointing=300,
        )

        addons = {"no_delay": "true"}
        
        if await self.dg_connection.start(options, addons=addons) is False:
            print(f"Failed to connect to Deepgram for {self.source_type}")
            return False
        
        # Create aiohttp session
        self.session = aiohttp.ClientSession()
        return True

    async def on_open(self, *args, **kwargs):
        print(f"{self.source_type} Deepgram Connection Open")

    async def on_message(self, self_, result, **kwargs):
        sentence = result.channel.alternatives[0].transcript
        if len(sentence) == 0:
            return
        if result.is_final:
            self.is_finals.append(sentence)
            if result.speech_final:
                utterance = " ".join(self.is_finals)
                
                # Only get and broadcast sentiment for client
                if self.source_type == "client":
                    sentiment = await self.get_sentiment(utterance)
                    await self.broadcast_sentiment(utterance, sentiment)
                    print(f"Client Speech Final: {utterance} (Sentiment: {sentiment})")
                else:
                    print(f"Host Speech Final: {utterance}")
                    
                self.write_to_transcript(utterance)  # Write transcription for both
                self.is_finals = []

    async def on_metadata(self, *args, **kwargs):
        pass

    async def on_speech_started(self, *args, **kwargs):
        pass

    async def on_utterance_end(self, *args, **kwargs):
        if len(self.is_finals) > 0:
            utterance = " ".join(self.is_finals)
            self.write_to_transcript(utterance)
            self.is_finals.clear()

    async def on_close(self, *args, **kwargs):
        # Close the aiohttp session
        if self.session:
            await self.session.close()
        print(f"{self.source_type} Deepgram Connection Closed")

    async def on_error(self, self_, error, **kwargs):
        print(f"{self.source_type} Error: {error}")

    async def process_audio(self, audio_data):
        await self.dg_connection.send(audio_data)

    async def get_sentiment(self, text: str) -> str:
        """Get sentiment analysis for the given text."""
        try:
            url = 'https://riu-rd-emoroberta-api.hf.space/emoroberta'
            headers = {
                'accept': 'application/json',
                'Content-Type': 'application/json'
            }
            data = {'input': text}
            
            async with self.session.post(url, json=data, headers=headers) as response:
                if response.status == 200:
                    result = await response.json()
                    # Get the label with highest score
                    predictions: List[Dict] = result['predictions']
                    max_sentiment = max(predictions, key=lambda x: x['score'])
                    return max_sentiment['label'].lower()
                else:
                    print(f"Error getting sentiment: {response.status}")
                    return "neutral"
        except Exception as e:
            print(f"Error in sentiment analysis: {e}")
            return "neutral"

    async def broadcast_sentiment(self, utterance: str, sentiment: str):
        """Broadcast sentiment analysis results for client only."""
        if self.source_type != "client":
            return
            
        if self.sentiment_websocket:
            message = {
                "text": utterance,
                "sentiment": sentiment,
                "timestamp": self.get_timestamp()
            }
            try:
                print(f"Broadcasting client sentiment: {message}")
                await self.sentiment_websocket.send(json.dumps(message))
            except Exception as e:
                print(f"Error broadcasting sentiment: {e}")
        else:
            print("No sentiment websocket connection available")

class AudioProcessor:
    def __init__(self, api_key):
        self.host_pipeline = TranscriptionPipeline("host")
        self.client_pipeline = TranscriptionPipeline("client")
        self.api_key = api_key
        self.transcript_file = self.create_transcript_file()
        self.sentiment_websocket = None
        self.server = None
        
    def create_transcript_file(self):
        # Create transcripts directory if it doesn't exist
        os.makedirs('transcripts', exist_ok=True)
        
        # Create a new transcript file with timestamp in name
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"transcripts/transcript_{timestamp}.txt"
        
        # Write header to the file
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(f"Transcript started at {timestamp}\n")
            f.write("-" * 50 + "\n\n")
            
        return filename
        
    async def start_sentiment_server(self):
        """Start WebSocket server for sentiment broadcasting."""
        async def handler(websocket, path):
            print("New client connected to sentiment server")  # Debug print
            # Update sentiment websocket for both pipelines
            self.sentiment_websocket = websocket
            self.host_pipeline.sentiment_websocket = websocket
            self.client_pipeline.sentiment_websocket = websocket
            
            try:
                await websocket.wait_closed()
            finally:
                print("Client disconnected from sentiment server")
                self.sentiment_websocket = None
                self.host_pipeline.sentiment_websocket = None
                self.client_pipeline.sentiment_websocket = None

        self.server = await websockets.serve(handler, "localhost", 8181)
        print("Sentiment WebSocket server started on port 8181")
        return self.server
        
    async def initialize(self):
        # Start sentiment WebSocket server first
        await self.start_sentiment_server()
        
        # Initialize both pipelines
        await self.host_pipeline.initialize(self.api_key, self.transcript_file, self.sentiment_websocket)
        await self.client_pipeline.initialize(self.api_key, self.transcript_file, self.sentiment_websocket)
        
    async def process_audio(self, websocket):
        try:
            async for message in websocket:
                data = json.loads(message)
                source = data["source"]
                audio_data = base64.b64decode(data["data"])
                
                if source == "host":
                    await self.host_pipeline.process_audio(audio_data)
                elif source == "client":
                    await self.client_pipeline.process_audio(audio_data)
                
        except websockets.exceptions.ConnectionClosed:
            print(f"WebSocket connection closed")
        except Exception as e:
            print(f"Error processing audio: {e}")

async def main():
    try:
        loop = asyncio.get_event_loop()
        
        processor = AudioProcessor(api_key="d7ce2e3f6336e4d41ab55e54023ebdb03b74f4fd")
        await processor.initialize()

        for signal in (SIGTERM, SIGINT):
            loop.add_signal_handler(
                signal,
                lambda: asyncio.create_task(shutdown(signal, loop, processor)),
            )

        async with websockets.connect('ws://localhost:8180') as websocket:
            print(f"Connected to ZoomBot WebSocket server")
            print(f"Saving transcript to: {processor.transcript_file}")
            await processor.process_audio(websocket)

    except Exception as e:
        print(f"Error: {e}")
        return

async def shutdown(signal, loop, processor):
    print(f"Received exit signal {signal.name}...")
    
    # Close WebSocket server
    processor.server.close()
    await processor.server.wait_closed()
    
    # Close aiohttp sessions
    if processor.host_pipeline.session:
        await processor.host_pipeline.session.close()
    if processor.client_pipeline.session:
        await processor.client_pipeline.session.close()
    
    # Write closing message to transcript
    with open(processor.transcript_file, 'a', encoding='utf-8') as f:
        f.write(f"\n\nTranscript ended at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    if processor.host_pipeline.dg_connection:
        await processor.host_pipeline.dg_connection.finish()
    if processor.client_pipeline.dg_connection:
        await processor.client_pipeline.dg_connection.finish()
    
    tasks = [t for t in asyncio.all_tasks() if t is not asyncio.current_task()]
    [task.cancel() for task in tasks]
    print(f"Cancelling {len(tasks)} outstanding tasks")
    await asyncio.gather(*tasks, return_exceptions=True)
    loop.stop()
    print("Shutdown complete.")

if __name__ == "__main__":
    asyncio.run(main())