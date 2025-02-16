const express = require('express');
const axios = require('axios');
require('dotenv').config();
const WebSocket = require('ws');
const bodyParser = require('body-parser');

// Create express app first
const app = express();

// Add body-parser middleware
app.use(bodyParser.json());

// Then create server with app
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));

// Store active WebSocket connections
const clients = new Set();

// WebSocket connection handler
wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('New WebSocket client connected');

    ws.on('close', () => {
        clients.delete(ws);
        console.log('Client disconnected');
    });
});

// Function to broadcast transcriptions to all connected clients
function broadcastTranscription(transcription) {
    console.log('Broadcasting transcription:', transcription);
    const message = JSON.stringify(transcription);
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(message);
                console.log('Successfully sent message to client');
            } catch (error) {
                console.error('Error sending message:', error);
            }
        }
    });
}

app.get('/auth/zoom', (req, res) => {                           //Authentication route, the user will get redirected to the zoom login portal for authentication
    const zoomAuthUrl = 'https://zoom.us/oauth/authorize';
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.ZOOM_CLIENT_ID,
        redirect_uri: process.env.ZOOM_REDIRECT_URI
    });
    res.redirect(`${zoomAuthUrl}?${params.toString()}`); // redirect user to zoom login
});

// add this new function to get user profile
const getUserProfile = async (accessToken) => {
    const response = await axios.get('https://api.zoom.us/v2/users/me', {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    return response.data;
};

app.get('/callback', async (req, res) => {
    const { code } = req.query;
    
    try {
        const tokenResponse = await axios.post('https://zoom.us/oauth/token', null, {
            params: {
                grant_type: 'authorization_code',
                code,
                redirect_uri: process.env.ZOOM_REDIRECT_URI
            },
            headers: {
                Authorization: `Basic ${Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64')}`
            }
        });
        
        const { access_token } = tokenResponse.data;
        
        // get user profile after successful authentication
        const userProfile = await getUserProfile(access_token);
        // console.log('User Profile Fetched:', userProfile);
        console.log("User PMI ID:", userProfile.pmi);    //users pmi id
        console.log("User Id:", userProfile.id);         //users id
        
        // Fetch PMI password using the correct endpoint
        const userSettings = await axios.get(`https://api.zoom.us/v2/users/${userProfile.id}/settings`, {
            headers: {
                Authorization: `Bearer ${access_token}`
            }
        });

        const pmiPassword = userSettings.data.schedule_meeting.pmi_password;
        console.log('PMI Password:', pmiPassword);

        // Redirect back to frontend with PMI and password
        const params = new URLSearchParams({
            connected: 'true',
            pmi: userProfile.pmi,
            password: pmiPassword
        });
        
        res.redirect(`/?${params.toString()}`);
    } catch (error) {
        console.error('Zoom OAuth error:', error);
        res.redirect('/?error=auth_failed');
    }
});

// Add this to your existing endpoints
app.post('/api/transcription', (req, res) => {
    console.log('Received transcription:', req.body);
    const transcription = req.body;
    
    if (!transcription || !transcription.text || !transcription.text.trim()) {
        console.log('Skipping empty transcription');
        return res.json({ success: true });
    }
    
    broadcastTranscription(transcription);
    res.json({ success: true });
});

const PORT = process.env.PORT || 4000; // match your oauth redirect port
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`); // start the server
    // console.log("")
}); 