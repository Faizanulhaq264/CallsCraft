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
const clientRoutes = require('./routes/clientRoutes'); // Import client routes
const zoomBotRoutes = require('./routes/zoomBotRoutes');
const zoomRoutes = require('./routes/zoomRoutes');
const { router: scoreRoutes } = require('./utils/score-formulas');

// Use routers
app.use('/api', userRoutes);
app.use('/api', callRoutes);
app.use('/api', clientRoutes); // Use client routes
app.use('/api', zoomBotRoutes);
app.use('/api', zoomRoutes);
app.use('/api', scoreRoutes);

/* ======================================================================================== */

// Start the server
const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
