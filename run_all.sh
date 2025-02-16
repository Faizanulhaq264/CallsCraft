#!/bin/bash

# Kill any existing processes on the required ports
echo "Cleaning up existing processes..."
kill $(lsof -t -i:4000) 2>/dev/null || true  # Backend port
kill $(lsof -t -i:5173) 2>/dev/null || true  # Vite frontend port

# Start the backend server
echo "Starting backend server..."
cd backend
node server.js &
BACKEND_PID=$!

# Start the frontend
echo "Starting frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Start the audio processor
echo "Starting audio processor..."
cd ../backend/audio-processing
python3 audio_processor.py &
AUDIO_PID=$!

# Function to handle script termination
cleanup() {
    echo "Shutting down services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    kill $AUDIO_PID 2>/dev/null
    exit 0
}

# Set up trap to catch termination signal
trap cleanup SIGINT SIGTERM

# Keep script running and show logs
echo "All services started! Press Ctrl+C to stop all services."
wait