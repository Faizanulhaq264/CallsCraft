from signal import SIGINT, SIGTERM
import asyncio
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
import inspect  # Add this import
import websockets.server
import mysql.connector
from mysql.connector import Error
from collections import deque  # Add this import
import shutil
from deepgram import (
    DeepgramClient,
    DeepgramClientOptions,
    LiveTranscriptionEvents,
    LiveOptions,
)



# MOVE DATABASE FUNCTIONS TO THE TOP OF THE FILE
# =============================================

# Database connection functions
def get_db_config():
    """
    Extract database configuration from the .env file in the backend directory
    """
    try:
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        env_file = os.path.join(backend_dir, ".env")
        
        env_vars = {}
        if os.path.exists(env_file):
            with open(env_file, 'r') as f:
                for line in f:
                    line = line.strip()  # Fixed: line.strip() is now assigned
                    if line and not line.startswith('//') and not line.startswith('#'):
                        if '=' in line:
                            key, value = line.split('=', 1)
                            env_vars[key] = value.strip('"\'')
        
        return {
            'host': env_vars.get('DB_HOST', 'localhost'),
            'port': int(env_vars.get('DB_PORT', 3306)),
            'user': env_vars.get('DB_USER', 'root'),
            'password': env_vars.get('DB_PASSWORD', ''),
            'database': env_vars.get('DB_NAME', 'callsCraft')
        }
    except Exception as e:
        print(f"Error reading database config: {e}")
        return {
            'host': 'localhost',
            'port': 3306,
            'user': 'root',
            'password': '',
            'database': 'callsCraft'
        }

def connect_to_db():
    """
    Establish a connection to the MySQL database
    """
    try:
        config = get_db_config()
        conn = mysql.connector.connect(**config)
        print("Connected to MySQL database!")
        return conn
    except Error as e:
        print(f"Error connecting to MySQL database: {e}")
        return None

def get_active_call_id(db_conn):
    """
    Get the most recent active call ID from the database
    """
    if not db_conn or not db_conn.is_connected():
        return None
    
    try:
        cursor = db_conn.cursor()
        # Get the most recent active call
        query = """
        SELECT CallID FROM meetingCall 
        WHERE EndTime IS NULL
        ORDER BY StartTime DESC LIMIT 1
        """
        cursor.execute(query)
        result = cursor.fetchone()
        cursor.close()
        
        if result:
            call_id = result[0]
            print(f"Processing audio for active call ID: {call_id}")
            return call_id
        else:
            print("No active calls found in database")
            return None
    except Error as e:
        print(f"Database error retrieving active call: {e}")
        return None

def store_audio_sentiment(db_conn, call_id, sentiment):
    """
    Store audio sentiment results in the database
    """
    if not call_id:
        print("Cannot store sentiment: No active call ID")
        return False
    
    if not db_conn or not db_conn.is_connected():
        db_conn = connect_to_db()
        if not db_conn:
            return False
    
    try:
        cursor = db_conn.cursor()
        
        # Insert sentiment analysis results
        query = """
        INSERT INTO AudioResults 
        (CallID, Sentiment, Timestamp) 
        VALUES (%s, %s, %s)
        """
        current_time = datetime.now()
        cursor.execute(query, (call_id, sentiment, current_time))
        
        db_conn.commit()
        cursor.close()
        print(f"Stored sentiment '{sentiment}' in database for call ID {call_id}")
        return True
    except Error as e:
        print(f"Database error storing audio sentiment: {e}")
        return False

async def broadcast_transcript(websocket, speaker, text):
    """
    Broadcast transcript to frontend or queue it if no connection is available
    """
    timestamp = datetime.now().strftime("%H:%M:%S")
    message = {
        "type": "transcript",
        "data": {
            "speaker": speaker.capitalize(),  # "Host" or "Client"
            "text": text,
            "timestamp": timestamp
        }
    }
    
    # Convert to JSON string once
    json_message = json.dumps(message)
    print(f"Preparing broadcast: {speaker} - {text}", flush=True)
    
    # Check if websocket is None
    if websocket is None:
        print("WebSocket is None - queueing message for later delivery", flush=True)
        # Find the AudioProcessor instance
        # This assumes broadcast_transcript is called from methods in TranscriptionPipeline
        pipeline_instance = None
        frame = inspect.currentframe()
        try:
            while frame:
                if 'self' in frame.f_locals:
                    instance = frame.f_locals['self']
                    if isinstance(instance, TranscriptionPipeline):
                        pipeline_instance = instance
                        break
                frame = frame.f_back
        finally:
            del frame  # Avoid reference cycles
            
        if pipeline_instance and hasattr(pipeline_instance, 'processor'):
            # Queue the message if we have access to the processor
            pipeline_instance.processor.message_queue.append(json_message)
            print(f"Message queued. Queue size now: {len(pipeline_instance.processor.message_queue)}", flush=True)
            return False
        else:
            print("Could not find AudioProcessor instance to queue message", flush=True)
            return False
    
    try:
        await websocket.send(json_message)
        print(f"Broadcast sent: {speaker} - {text}", flush=True)
        return True
    except Exception as e:
        print(f"Error broadcasting transcript: {e}", flush=True)
        return False

# THE REST OF YOUR CODE STAYS THE SAME
# =============================================

class TranscriptionPipeline:
    def __init__(self, source_type):
        self.source_type = source_type  # "host" or "client"
        self.is_finals = []
        self.dg_connection = None
        self.transcript_file = None
        self.session = None
        self.sentiment_websocket = None
        self.processor = None  # Add reference to the parent AudioProcessor
        # Add database connection
        self.db_conn = None
        self.call_id = None
        
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
        
        # Initialize database connection
        self.db_conn = connect_to_db()
        if self.db_conn:
            self.call_id = get_active_call_id(self.db_conn)
        
        return True

    async def on_open(self, *args, **kwargs):
        print(f"{self.source_type} Deepgram Connection Open")

    async def on_message(self, self_, result, **kwargs):
        try:
            sentence = result.channel.alternatives[0].transcript
            if len(sentence) == 0:
                return
                
            if result.is_final:
                self.is_finals.append(sentence)
                if result.speech_final:
                    utterance = " ".join(self.is_finals)
                    
                    # Write to transcript file (for both host and client)
                    self.write_to_transcript(utterance)
                    print("This was spoken by the: " , self.source_type , flush=True)
                    # Broadcast transcript to frontend (for both host and client)
                    message = {
                        "type": "transcript",
                        "data": {
                            "speaker": self.source_type.capitalize(),
                            "text": utterance,
                            "timestamp": datetime.now().strftime("%H:%M:%S")
                        }
                    }
                    await self.websocket_send(message)
                    
                    # Only get sentiment and store in database for client
                    if self.source_type == "client":
                        sentiment = await self.get_sentiment(utterance)
                        
                        # Store sentiment in database
                        if sentiment and self.db_conn and self.call_id:
                            store_audio_sentiment(self.db_conn, self.call_id, sentiment)
                            
                        print(f"Client Speech Final: {utterance} (Sentiment: {sentiment})")
                    else:
                        print(f"Host Speech Final: {utterance}")
                        
                    self.is_finals = []
        except Exception as e:
            print(f"Error processing transcript: {e}")

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

    async def websocket_send(self, message_dict):
        """Safely send a message to the websocket or queue it if not available"""
        if not self.sentiment_websocket:
            if hasattr(self, 'processor') and self.processor:
                json_str = json.dumps(message_dict)
                self.processor.message_queue.append(json_str)
                print(f"Message queued. Queue size: {len(self.processor.message_queue)}")
                return True
            return False
            
        try:
            await self.sentiment_websocket.send(json.dumps(message_dict))
            return True
        except Exception as e:
            print(f"Error sending to websocket: {e}")
            return False

class AudioProcessor:
    def __init__(self, api_key):
        self.host_pipeline = TranscriptionPipeline("host")
        self.client_pipeline = TranscriptionPipeline("client")
        # Set the processor reference in both pipelines
        self.host_pipeline.processor = self
        self.client_pipeline.processor = self
        self.api_key = api_key
        self.transcript_file = self.create_transcript_file()
        self.sentiment_websocket = None
        self.server = None
        self.message_queue = deque()  # Add a queue to store messages when no client is connected
        
    def create_transcript_file(self):
        # No longer delete existing directory here
        
        # Create a transcripts directory if it doesn't exist
        print("Creating transcripts directory if needed...")
        os.makedirs('transcripts', exist_ok=True)
        
        # Create a new transcript file with timestamp in name
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"transcripts/transcript_{timestamp}.txt"
        print(f"Creating new transcript file: {filename}")
        
        # Write header to the file
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(f"Transcript started at {timestamp}\n")
            f.write("-" * 50 + "\n\n")
            
        return filename
        
    async def start_sentiment_server(self):
        """Start WebSocket server for sentiment broadcasting."""
        async def handler(websocket, path):
            print("New client connected to sentiment server", flush=True)
            
            # Update sentiment websocket for all instances that need it
            self.sentiment_websocket = websocket
            self.host_pipeline.sentiment_websocket = websocket
            self.client_pipeline.sentiment_websocket = websocket
            
            print("WebSocket connection established and assigned to pipelines", flush=True)
            
            # Send all queued messages when a client connects
            await self.send_queued_messages(websocket)
            
            try:
                # Keep the connection alive until the client disconnects
                await websocket.wait_closed()
            finally:
                print("Client disconnected from sentiment server", flush=True)
                # Only set to None if this is the current websocket
                if self.sentiment_websocket is websocket:
                    self.sentiment_websocket = None
                if self.host_pipeline.sentiment_websocket is websocket:
                    self.host_pipeline.sentiment_websocket = None
                if self.client_pipeline.sentiment_websocket is websocket:
                    self.client_pipeline.sentiment_websocket = None

        self.server = await websockets.serve(handler, "localhost", 8181)
        print("Sentiment WebSocket server started on port 8181", flush=True)
        return self.server
    
    async def send_queued_messages(self, websocket):
        """Send all queued messages to the client that just connected"""
        print(f"Attempting to send {len(self.message_queue)} queued messages", flush=True)
        while self.message_queue:
            message = self.message_queue.popleft()
            try:
                await websocket.send(message)
                print(f"Sent queued message: {message[:100]}...", flush=True)
            except Exception as e:
                print(f"Error sending queued message: {e}", flush=True)
                # Put the message back in the queue
                self.message_queue.appendleft(message)
                break
        
    async def initialize(self):
        # Start sentiment WebSocket server first
        await self.start_sentiment_server()
        
        # Initialize both pipelines with None for now 
        # We'll update the websocket connection when a client connects
        await self.host_pipeline.initialize(self.api_key, self.transcript_file, None)
        await self.client_pipeline.initialize(self.api_key, self.transcript_file, None)
        
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

    async def monitor_websockets(self):
        """Monitor the state of WebSocket connections."""
        while True:
            print("======= WebSocket Status =======", flush=True)
            print(f"AudioProcessor.sentiment_websocket: {self.sentiment_websocket is not None}", flush=True)
            print(f"Host pipeline.sentiment_websocket: {self.host_pipeline.sentiment_websocket is not None}", flush=True)
            print(f"Client pipeline.sentiment_websocket: {self.client_pipeline.sentiment_websocket is not None}", flush=True)
            print("===============================", flush=True)
            await asyncio.sleep(10)  # Check every 10 seconds

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

        # Add reconnection loop
        while True:
            try:
                print("Connecting to ZoomBot WebSocket server on port 8180...")
                async with websockets.connect('ws://localhost:8180') as websocket:
                    print(f"Connected to ZoomBot WebSocket server")
                    print(f"Saving transcript to: {processor.transcript_file}")
                    await processor.process_audio(websocket)
            except websockets.exceptions.ConnectionClosed:
                print("Connection to ZoomBot WebSocket server closed")
                print("Attempting to reconnect in 5 seconds...")
                await asyncio.sleep(5)
            except ConnectionRefusedError:
                print("Connection to ZoomBot WebSocket server refused")
                print("Attempting to reconnect in 5 seconds...")
                await asyncio.sleep(5)
            except Exception as e:
                print(f"Error connecting to ZoomBot WebSocket server: {e}")
                print("Attempting to reconnect in 5 seconds...")
                await asyncio.sleep(5)

        # Start the monitor
        asyncio.create_task(processor.monitor_websockets())

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
    
    # Create DOWNLOADABLES directory if it doesn't exist
    print("Creating DOWNLOADABLES directory...")
    os.makedirs('DOWNLOADABLES', exist_ok=True)
    
    # Copy the transcript file to DOWNLOADABLES
    transcript_filename = os.path.basename(processor.transcript_file)
    destination_path = os.path.join('DOWNLOADABLES', transcript_filename)
    shutil.copy2(processor.transcript_file, destination_path)
    print(f"Transcript file saved to: {destination_path}")
    
    # Now that we've safely copied the file, delete the transcripts directory
    print("Removing transcripts directory...")
    try:
        shutil.rmtree('transcripts')
        print("Transcripts directory removed successfully")
    except Exception as e:
        print(f"Error removing transcripts directory: {e}")
    
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