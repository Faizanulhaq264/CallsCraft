/* 
    Contains all the necessary endpoints to interact with Zoom Official Servers
    These endpoints are used to get the authentication token for users and get credentials
*/

const express = require('express');
const axios = require('axios');
const { encrypt, decrypt } = require('../utils/utility-functions');  // Import encryption functions
const db = require('../db/db-configs');  // Import the database connection
require('dotenv').config();

const router = express.Router();

// Authentication route, the user will get redirected to the Zoom login portal for authentication
router.get('/auth/zoom', (req, res) => {
    const { userId } = req.query; // Get userId from query parameter
    
    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }
    
    // Store userId in the state parameter for security
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    
    const zoomAuthUrl = 'https://zoom.us/oauth/authorize';
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.ZOOM_CLIENT_ID,
        redirect_uri: process.env.ZOOM_REDIRECT_URI,
        state // Include state parameter with encoded userId
    });
    res.redirect(`${zoomAuthUrl}?${params.toString()}`);
});

// Function to get user profile
const getUserProfile = async (accessToken) => {
    const response = await axios.get('https://api.zoom.us/v2/users/me', {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    return response.data;
};

// Callback endpoint to handle Zoom OAuth
router.get('/callback', async (req, res) => {
    const { code, state } = req.query;
    
    // Decode the state parameter to get userId
    let userId;
    try {
        const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
        userId = decodedState.userId;
    } catch (error) {
        console.error('Invalid state parameter:', error);
        return res.redirect(`${process.env.CLIENT_URL}?error=invalid_state`);
    }
    
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
        
        // Get user profile after successful authentication
        const userProfile = await getUserProfile(access_token);
        // console.log("User PMI ID:", userProfile.pmi);    // User's PMI ID
        // console.log("User Id:", userProfile.id);         // User's ID
        // console.log("Access Token: ", access_token);
        // Fetch PMI password using the correct endpoint
        const userSettings = await axios.get(`https://api.zoom.us/v2/users/${userProfile.id}/settings`, {
            headers: {
                Authorization: `Bearer ${access_token}`
            }
        });

        const pmiPassword = userSettings.data.schedule_meeting.pmi_password;
        console.log('PMI Password:', pmiPassword);

        // Encrypt the values
        const encryptedPMI = encrypt(userProfile.pmi);
        const encryptedPMIPassword = encrypt(pmiPassword);
        const encryptedZoomID = encrypt(userProfile.id);
        const encryptedAccessToken = encrypt(access_token);

        // Store PMI ID, PMI password, Zoom user ID, and access token in the database
        const insertZoomInfoQuery = `
            INSERT INTO UserZoomSettings (UserID, PMI, PMI_Password, ZoomID, ZoomAccessToken)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            PMI = VALUES(PMI),
            PMI_Password = VALUES(PMI_Password),
            ZoomID = VALUES(ZoomID),
            ZoomAccessToken = VALUES(ZoomAccessToken);
        `;
        db.query(insertZoomInfoQuery, [userId, encryptedPMI, encryptedPMIPassword, encryptedZoomID, encryptedAccessToken], (err, result) => {
            if (err) {
                console.error('Error updating Zoom info:', err);
                return res.status(500).json({ message: 'Error updating Zoom info' });
            }

            console.log('Zoom info updated successfully');
        });

        // Redirect back to frontend with success parameters
        const params = new URLSearchParams({
            connected: 'true',
            pmi: userProfile.pmi,
            password: pmiPassword
        });
        
        // Redirect to the zoom-integration page with success parameters
        res.redirect(`${process.env.CLIENT_URL}/zoom-integration?${params.toString()}`);
    } catch (error) {
        console.error('Zoom OAuth error:', error);
        res.redirect(`${process.env.CLIENT_URL}/zoom-integration?error=auth_failed`);
    }
});

// Get user's Zoom meeting credentials from the database & Decrypts the credentials
router.get('/meeting-credentials/:userId', (req, res) => {
    const { userId } = req.params;
    console.log("\n\nUser ID:", userId);
    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }
    
    // Query to get the user's Zoom settings
    const query = 'SELECT PMI, PMI_Password FROM UserZoomSettings WHERE UserID = ?';
    
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Error fetching Zoom credentials' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ message: 'Zoom credentials not found. Please connect your Zoom account first.' });
        }
        
        // Decrypt the credentials
        try {
            const pmi = decrypt(results[0].PMI);
            const password = decrypt(results[0].PMI_Password);
            console.log('Decrypted PMI:', pmi);
            console.log('Decrypted Password:', password);
            res.json({
                meetingNumber: pmi,
                password: password
            });
        } catch (error) {
            console.error('Decryption error:', error);
            return res.status(500).json({ message: 'Error decrypting Zoom credentials' });
        }
    });
});

module.exports = router;