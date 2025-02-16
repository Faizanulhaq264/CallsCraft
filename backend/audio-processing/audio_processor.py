import os
import time
import numpy as np
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from deepgram import DeepgramClient, PrerecordedOptions
from datetime import datetime
import requests
import asyncio
from functools import partial
from dotenv import load_dotenv

# load_dotenv()
print("Starting audio processing...")

class AudioProcessor:
    def __init__(self, raw_audio_dir, api_key):
        self.raw_audio_dir = raw_audio_dir
        self.deepgram = DeepgramClient(api_key=api_key)
        self.transcript_buffer = []  # Store transcripts with timestamps
        # Create call_transcripts directory next to call_recordings
        self.transcript_dir = os.path.join(os.path.dirname(raw_audio_dir), "call_transcripts")
        os.makedirs(self.transcript_dir, exist_ok=True)
        # Create a new transcript file with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.transcript_file = os.path.join(self.transcript_dir, f"transcript_{timestamp}.txt")
        print(f"Saving transcript to: {self.transcript_file}")
        
    def raw_to_wav_buffer(self, raw_path):
        """Convert raw audio to WAV format in memory"""
        # Read raw audio data
        raw_data = np.fromfile(raw_path, dtype=np.int16)
        
        # Audio parameters from Zoom SDK
        sample_rate = 32000  # Zoom uses 32kHz
        channels = 1
        bits_per_sample = 16
        
        # Calculate expected samples for 3 seconds
        expected_samples = sample_rate * 3
        if len(raw_data) != expected_samples:
            print(f"Warning: Raw data length ({len(raw_data)} samples) differs from expected 3-second length ({expected_samples} samples)")
        
        # Create WAV header
        header = bytes()
        header += b'RIFF'
        header += (36 + len(raw_data) * 2).to_bytes(4, 'little')  # File size (2 bytes per sample)
        header += b'WAVE'
        header += b'fmt '
        header += (16).to_bytes(4, 'little')  # Format chunk size
        header += (1).to_bytes(2, 'little')  # Format tag (PCM)
        header += channels.to_bytes(2, 'little')
        header += sample_rate.to_bytes(4, 'little')
        header += (sample_rate * channels * bits_per_sample // 8).to_bytes(4, 'little')  # Bytes per second
        header += (channels * bits_per_sample // 8).to_bytes(2, 'little')  # Block align
        header += bits_per_sample.to_bytes(2, 'little')
        header += b'data'
        header += (len(raw_data) * 2).to_bytes(4, 'little')  # Data size (2 bytes per sample)
        
        # Combine header and audio data
        wav_buffer = header + raw_data.tobytes()
        
        # Log duration info
        duration = len(raw_data) / sample_rate
        print(f"Audio duration: {duration:.2f} seconds")
        
        return wav_buffer

    async def transcribe_audio(self, wav_buffer, speaker_type):
        """Send audio to Deepgram and get transcription with speaker info"""
        options = PrerecordedOptions(
            model="nova-2",
            smart_format=True,
        )
        
        try:
            payload = {
                "buffer": wav_buffer,
            }

            response = self.deepgram.listen.rest.v("1").transcribe_file(payload, options)
            transcript = response.results.channels[0].alternatives[0].transcript
            
            if transcript.strip():  # Check if transcript is non-empty
                transcription = {
                    'speaker': speaker_type,
                    'text': transcript,
                    'timestamp': datetime.now().isoformat()
                }
                
                print(f"Transcription: {transcription}")
                
                # Append to transcript file immediately
                self.append_to_transcript(transcription)
                
                try:
                    requests.post('http://localhost:4000/api/transcription', json=transcription)
                    print("Sent to backend successfully")
                except Exception as e:
                    print(f"Error sending to backend: {e}")
            else:
                print("Skipping empty transcription")
            
            return response
            
        except Exception as e:
            print(f"Transcription error: {e}")
            return None

    def append_to_transcript(self, transcription):
        """Append a single transcription to the file immediately"""
        try:
            with open(self.transcript_file, 'a', encoding='utf-8') as f:
                timestamp = datetime.fromisoformat(transcription['timestamp']).strftime("%H:%M:%S")
                speaker = "Host" if transcription['speaker'] == "host" else "Client"
                text = transcription['text']
                f.write(f"[{timestamp}] {speaker}: {text}\n")
                f.flush()  # Ensure it's written to disk immediately
        except Exception as e:
            print(f"Error appending to transcript: {e}")

class AudioFileHandler(FileSystemEventHandler):
    def __init__(self, audio_processor, loop):
        self.audio_processor = audio_processor
        self.loop = loop  # Store event loop reference

    def on_created(self, event):  # Remove async
        if event.is_directory or not event.src_path.endswith('.raw'):
            return
        
        print(f"New audio file detected: {event.src_path}")
        
        # Schedule the async processing in the event loop
        asyncio.run_coroutine_threadsafe(
            self.process_file(event), 
            self.loop
        )
    
    async def process_file(self, event):
        try:
            filename = Path(event.src_path).name
            speaker_type = "host" if filename.startswith("host_") else "client"
            
            wav_buffer = self.audio_processor.raw_to_wav_buffer(event.src_path)
            response = await self.audio_processor.transcribe_audio(wav_buffer, speaker_type)
            
            os.remove(event.src_path)
            
        except Exception as e:
            print(f"Error processing file {event.src_path}: {e}")

def format_timestamp(seconds):
    """Convert seconds to HH:MM:SS format"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = int(seconds % 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

def main():
    # Create new event loop
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    DEEPGRAM_API_KEY = "441193c57ba47826f88b7d62e3ca48a4c892fdea"
    
    # Update path to include call_recordings subfolder
    RAW_AUDIO_DIR = os.path.abspath(os.path.join(
        os.path.dirname(__file__), 
        "../../zoomBot/recordings"
    ))
    # RAW_AUDIO_DIR = os.path.abspath("../recordings")
    
    # Create both directories if they don't exist
    os.makedirs(RAW_AUDIO_DIR, exist_ok=True)
    print(f"Watching for audio files in: {RAW_AUDIO_DIR}")
    
    audio_processor = AudioProcessor(RAW_AUDIO_DIR, DEEPGRAM_API_KEY)
    event_handler = AudioFileHandler(audio_processor, loop)
    observer = Observer()
    observer.schedule(event_handler, RAW_AUDIO_DIR, recursive=False)
    observer.start()
    
    try:
        # Run the event loop
        loop.run_forever()
    except KeyboardInterrupt:
        observer.stop()
        loop.stop()
    observer.join()
    loop.close()

if __name__ == "__main__":
    main() 