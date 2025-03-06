const express = require('express');
const { exec } = require('child_process');

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

module.exports = router;