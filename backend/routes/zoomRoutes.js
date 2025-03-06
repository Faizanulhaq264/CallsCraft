/* 
    Contains all the necessary endpoints to interact with Zoom Official Servers
    These endpoints are used to get the authentication token for users and get credentials
*/

const express = require('express');
const axios = require('axios');
require('dotenv').config();

const router = express.Router();

// Authentication route, the user will get redirected to the Zoom login portal for authentication
router.get('/auth/zoom', (req, res) => {
    const zoomAuthUrl = 'https://zoom.us/oauth/authorize';
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.ZOOM_CLIENT_ID,
        redirect_uri: process.env.ZOOM_REDIRECT_URI
    });
    res.redirect(`${zoomAuthUrl}?${params.toString()}`); // redirect user to zoom login
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
        
        // Get user profile after successful authentication
        const userProfile = await getUserProfile(access_token);
        console.log("User PMI ID:", userProfile.pmi);    // User's PMI ID
        console.log("User Id:", userProfile.id);         // User's ID
        
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

module.exports = router;