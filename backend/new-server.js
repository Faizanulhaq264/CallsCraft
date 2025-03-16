const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({
    origin: process.env.CLIENT_URL ,
    methods: "GET,POST,PUT,DELETE,OPTIONS", // Allowed request methods
    allowedHeaders: "Content-Type,Authorization", // Allowed headers
    credentials: true
}));
/* ======================================================================================== */

// Import routers
const userRoutes = require('./routes/userRoutes');
const callRoutes = require('./routes/callRoutes');
const zoomBotRoutes = require('./routes/zoomBotRoutes');  // Import Zoom bot routes
const zoomRoutes = require('./routes/zoomRoutes');  // Import Zoom routes

// Use routers
app.use('/api', userRoutes);
app.use('/api', callRoutes);
app.use('/api', zoomBotRoutes);  // Use Zoom bot routes
app.use('/api', zoomRoutes);  // Use Zoom routes

/* ======================================================================================== */

// Start the server
const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
