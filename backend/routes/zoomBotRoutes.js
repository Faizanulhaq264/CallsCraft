const express = require('express');
const { exec } = require('child_process');
const db = require('../db/db-configs'); //database connection module

const router = express.Router();

/* ============================================================= */
// Endpoint to start the Zoom bot
router.post('/start-zoom-bot', (req, res) => {
    const command = `
        docker run -it --rm \
        -p 8180:8180 \
        -p 8080:8080 \
        --name zoom-sdk-container \
        zoom-meeting-sdk
    `;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error starting Zoom bot: ${error.message}`);
            return res.status(500).json({ message: 'Error starting Zoom bot' });
        }

        if (stderr) {
            console.error(`Zoom bot stderr: ${stderr}`);
        }

        console.log(`Zoom bot stdout: ${stdout}`);
        res.json({ message: 'Zoom bot started successfully' });
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

module.exports = router;