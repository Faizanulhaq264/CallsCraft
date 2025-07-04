const express = require('express');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const db = require('../db/db-configs');

const router = express.Router();

// Function to generate a temporary config.txt file with dynamic credentials
function generateConfigFile(meetingNumber, password, token) {
    const configContent = `meeting_number: "${meetingNumber}"
token: "${token}"
meeting_password: "${password}"
recording_token: ""
GetVideoRawData: "true"
GetAudioRawData: "true"
SendVideoRawData: "false"
SendAudioRawData: "false"
`;

    // Path to the directory where we'll create the temp config file
    const configDir = path.join(__dirname, '..', '..', 'zoomBot-config');
    const configPath = path.join(configDir, 'config.txt');
    
    // Ensure the directory exists
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    
    // Write the config file
    fs.writeFileSync(configPath, configContent);
    
    return configPath;
}

/* ============================================================= */
// Endpoint to start the Zoom bot with dynamic credentials
router.post('/start-zoom-bot', (req, res) => {
    const { meetingNumber, password } = req.body;
    
    if (!meetingNumber || !password) {
        return res.status(400).json({ 
            success: false, 
            error: "Meeting number and password are required" 
        });
    }
    
    try {
        // Import the signature generation function from a utility file
        const { generateSignature } = require('../utils/zoomSignature');
        
        // Generate the JWT token for the meeting
        const token = generateSignature(
            process.env.ZOOM_SDK_KEY, 
            process.env.ZOOM_SDK_SECRET, 
            meetingNumber, 
            1 // Role 1 for host
        );
        
        console.log("Generated token for meeting:", meetingNumber);
        
        // Generate the config file with dynamic credentials
        const configPath = generateConfigFile(meetingNumber, password, token);
        
        console.log("Generated config file at:", configPath);
        
        // Now run the Docker container with the config file mounted to the external-config directory
        const command = `
            docker run -d --rm \\
            -p 8180:8180 \\
            -p 8080:8080 \\
            -v "${configPath}:/external-config/config.txt" \\
            --name zoom-sdk-container \\
            zoom-meeting-sdk2
        `;

        console.log("Starting Docker container with dynamic config...");

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error starting Zoom bot: ${error.message}`);
                return res.status(500).json({ success: false, error: error.message });
            }

            if (stderr) {
                console.error(`Zoom bot stderr: ${stderr}`);
            }

            console.log(`Zoom bot started successfully: ${stdout}`);
            res.status(200).json({ success: true, containerId: stdout.trim() });
        });
    } catch (error) {
        console.error(`Error in start-zoom-bot: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

/* ============================================================= */
// Endpoint to stop the Zoom bot
router.post('/stop-zoom-bot', (req, res) => {
    const command = `docker rm -f zoom-sdk-container`;
    
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error stopping Zoom bot: ${error}`);
            return res.status(500).json({ success: false, error: error.message });
        }
        
        console.log(`Zoom bot stopped successfully: ${stdout}`);
        res.status(200).json({ success: true });
    });
});

/* ============================================================= */
// Endpoint to get latest audio and video results after a timestamp
router.get('/audio-video-results', (req, res) => {
    const { timestamp } = req.query;
    
    if (!timestamp) {
        return res.status(400).json({ message: 'Timestamp is required' });
    }
    
    // Validate timestamp format
    const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
    if (!timestampRegex.test(timestamp)) {
        return res.status(400).json({ 
            message: 'Invalid timestamp format. Use YYYY-MM-DD HH:MM:SS' 
        });
    }
    
    // Query for audio results
    const audioQuery = `
        SELECT * FROM AudioResults 
        WHERE Timestamp > ? 
        ORDER BY Timestamp ASC
    `;
    
    // Query for video results
    const videoQuery = `
        SELECT * FROM VideoResults 
        WHERE Timestamp > ? 
        ORDER BY Timestamp ASC
    `;
    
    // Execute both queries
    db.query(audioQuery, [timestamp], (audioErr, audioResults) => {
        if (audioErr) {
            console.error('Error fetching audio results:', audioErr);
            return res.status(500).json({ message: 'Error fetching audio results' });
        }
        
        db.query(videoQuery, [timestamp], (videoErr, videoResults) => {
            if (videoErr) {
                console.error('Error fetching video results:', videoErr);
                return res.status(500).json({ message: 'Error fetching video results' });
            }
            
            // Return both results
            res.json({
                audioResults,
                videoResults,
                timestamp,
                newTimestamp: new Date().toISOString().slice(0, 19).replace('T', ' ')
            });
        });
    });
});

/* ============================================================= */
// Endpoint to start audio processor
router.post('/start-audio-processor', (req, res) => {
    // Path to the Python script
    const scriptPath = path.join(__dirname, '..', 'audio-processing', 'AudioProcessorFile.py');
    
    // Command to run the script with Python
    const command = `python3 "${scriptPath}"`;
    
    console.log("Starting Audio Processor...");
    
    // Execute the command as a detached process so it runs in the background
    const audioProcess = exec(command, { detached: true }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error starting Audio Processor: ${error}`);
            return;
        }
        if (stderr) {
            console.error(`Audio Processor stderr: ${stderr}`);
        }
    });
    
    // Set process ID in response
    const pid = audioProcess.pid;
    console.log(`Audio Processor started with PID: ${pid}`);
    
    // Don't wait for the process to finish - it will run in the background
    audioProcess.unref();
    
    res.status(200).json({ 
        success: true, 
        message: 'Audio Processor started',
        pid: pid
    });
});

/* ============================================================= */
// Endpoint to start video processor
router.post('/start-video-processor', (req, res) => {
    // Path to the Python script
    const scriptPath = path.join(__dirname, '..', 'video-processing', 'read_video.py');
    
    // Command to run the script with Python
    const command = `python3 "${scriptPath}"`;
    
    console.log("Starting Video Processor...");
    
    // Execute the command as a detached process so it runs in the background
    const videoProcess = exec(command, { detached: true }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error starting Video Processor: ${error}`);
            return;
        }
        if (stderr) {
            console.error(`Video Processor stderr: ${stderr}`);
        }
    });
    
    // Set process ID in response
    const pid = videoProcess.pid;
    console.log(`Video Processor started with PID: ${pid}`);
    
    // Don't wait for the process to finish - it will run in the background
    videoProcess.unref();
    
    res.status(200).json({ 
        success: true, 
        message: 'Video Processor started',
        pid: pid 
    });
});

/* ============================================================= */
// Endpoint to start both processors at once
router.post('/start-processors', (req, res) => {
    // Extract transcriptName from request body if provided
    const { transcriptName } = req.body;
    
    // Paths to Python scripts - using path.join to ensure correct paths
    const audioScriptPath = path.join(__dirname, '..', 'audio-processing', 'AudioProcessorFile.py');
    const videoScriptPath = path.join(__dirname, '..', 'video-processing', 'read_video.py');
    
    console.log(audioScriptPath);
    console.log(videoScriptPath);
    console.log("Starting Audio and Video Processors...");
    
    // Prepare command line arguments for audio processor
    const audioArgs = [audioScriptPath];
    console.log(`Using transcript name outside if: ${transcriptName}`);
    // Add transcript name argument if provided
    if (transcriptName) {
        console.log(`Using transcript name: ${transcriptName}`);
        audioArgs.push('--transcript-name', transcriptName);
    }
    
    // Start Audio Processor with spawn instead of exec
    const audioProcess = spawn('python3', audioArgs, { 
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
    });
    
    if (!audioProcess.pid) {
        console.error('Error starting Audio Processor in the backend');
    }

    // Capture output in real-time
    audioProcess.stdout.on('data', (data) => {
        console.log(`Audio Processor stdout: ${data}`);
    });
    
    audioProcess.stderr.on('data', (data) => {
        console.error(`Audio Processor stderr: ${data}`);
    });
    
    // Start Video Processor (keeping this unchanged)
    const videoProcess = spawn('python3', [videoScriptPath], {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // videoProcess.stdout.on('data', (data) => {
    //     console.log(`Video Processor stdout: ${data}`);
    // });
    
    // videoProcess.stderr.on('data', (data) => {
    //     console.error(`Video Processor stderr: ${data}`);
    // });
    
    // Set process IDs
    const audioPid = audioProcess.pid;
    const videoPid = videoProcess.pid;
    
    console.log(`Audio Processor started with PID: ${audioPid}`);
    console.log(`Video Processor started with PID: ${videoPid}`);
    
    // Don't wait for processes to finish - they will run in the background
    audioProcess.unref();
    videoProcess.unref();
    
    res.status(200).json({ 
        success: true, 
        message: 'Audio and Video Processors started',
        pids: {
            audio: audioPid,
            video: videoPid
        }
    });
});

/* ============================================================= */
// Endpoint to kill processes by PID
router.post('/stop-processor', (req, res) => {
    const { pid } = req.body;
    
    if (!pid) {
        return res.status(400).json({ 
            success: false, 
            error: "Process ID is required" 
        });
    }
    
    console.log(`[STOP PROCESSOR] Attempting to stop process with PID: ${pid}`);
    
    // First check if the process exists
    exec(`ps -p ${pid} -o pid=`, (checkError, checkStdout) => {
        if (checkError || !checkStdout.trim()) {
            console.log(`[STOP PROCESSOR] Process ${pid} not found, considering it already stopped`);
            return res.status(200).json({
                success: true,
                message: `Process with PID ${pid} is not running or already stopped`
            });
        }
        
        console.log(`[STOP PROCESSOR] Found process ${pid}, attempting to kill it`);
        
        // Process exists, try to kill it (using SIGTERM first for graceful shutdown)
        exec(`kill ${pid}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`[STOP PROCESSOR] Error with SIGTERM: ${error.message}`);
                
                // If SIGTERM fails, try SIGKILL as a fallback
                exec(`kill -9 ${pid}`, (killError, killStdout, killStderr) => {
                    if (killError) {
                        console.error(`[STOP PROCESSOR] Error with SIGKILL: ${killError.message}`);
                        return res.status(500).json({ 
                            success: false, 
                            error: `Failed to stop process: ${killError.message}`,
                        });
                    }
                    
                    console.log(`[STOP PROCESSOR] Process ${pid} stopped with SIGKILL`);
                    return res.status(200).json({ 
                        success: true, 
                        message: `Process with PID ${pid} forcibly stopped with SIGKILL` 
                    });
                });
            } else {
                console.log(`[STOP PROCESSOR] Process with PID ${pid} stopped successfully with SIGTERM`);
                res.status(200).json({ 
                    success: true, 
                    message: `Process with PID ${pid} stopped successfully` 
                });
            }
        });
    });
});

/* ============================================================= */
// Endpoint to get the latest transcript file content
router.get('/latest-transcript', (req, res) => {
    try {
        const transcriptsDir = path.join(__dirname, '../transcripts');
        
        // Get all files in transcripts directory
        const files = fs.readdirSync(transcriptsDir)
            .filter(file => file.startsWith('transcript_'))
            .map(file => ({
                name: file,
                path: path.join(transcriptsDir, file),
                created: fs.statSync(path.join(transcriptsDir, file)).birthtime
            }))
            .sort((a, b) => b.created - a.created); // Sort newest first
        
        if (files.length === 0) {
            return res.status(404).json({ error: 'No transcript files found' });
        }
        
        // Get the newest file
        const latestFile = files[0];
        const content = fs.readFileSync(latestFile.path, 'utf-8');
        
        res.json({
            filename: latestFile.name,
            content: content,
            created: latestFile.created
        });
    } catch (error) {
        console.error('Error reading transcript files:', error);
        res.status(500).json({ error: 'Failed to read transcript files' });
    }
});

module.exports = router;