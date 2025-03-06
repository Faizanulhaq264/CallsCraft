const express = require('express');
const moment = require('moment');
const db = require('../db/db-configs');  // Import the database connection

const router = express.Router();

/* ============================================================================================ */
// Starting a call
router.post('/start-call', (req, res) => {
    const { clientID, userID } = req.body;  // Expect clientID and userID from frontend

    // Step 1: Create a new entry in the meetingCall table
    const startTime = moment().format('YYYY-MM-DD HH:mm:ss');
    const insertCallQuery = `
        INSERT INTO meetingCall (StartTime, EndTime, ClientID, UserID)
        VALUES (?, NULL, ?, ?);
    `;

    db.query(insertCallQuery, [startTime, clientID, userID], (err, result) => {
        if (err) {
            console.error('Error starting call:', err);
            return res.status(500).json({ message: 'Error starting call' });
        }

        const callID = result.insertId;  // Get the generated CallID

        // Step 2: Initialize a new entry in the Note table for the notepad
        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
        const insertNoteQuery = `
            INSERT INTO Note (Content, Timestamp, CallID)
            VALUES (?, ?, ?);
        `;

        db.query(insertNoteQuery, ['', timestamp, callID], (err, result) => {
            if (err) {
                console.error('Error initializing notepad:', err);
                return res.status(500).json({ message: 'Error initializing notepad' });
            }

            // Step 3: Creating a new entry in the Transcript table for a new transcript (one per call)
            const transcriptName = `transcript_call_id_${callID}`;  // Creating the transcript name with the callID to keep it unique
            console.log("The transcript name generated is==> ", transcriptName);
            const insertTranscriptQuery = `
                INSERT INTO Transcript (transcriptName)
                VALUES (?);
            `;

            db.query(insertTranscriptQuery, [transcriptName], (err, result) => {
                if (err) {
                    console.error('Error creating transcript:', err);
                    return res.status(500).json({ message: 'Error creating transcript' });
                }

                const transcriptID = result.insertId;  // Get the generated TranscriptID

                // Step 4: Update the meetingCall table with the generated TranscriptID
                const updateCallQuery = `
                    UPDATE meetingCall
                    SET TranscriptID = ?
                    WHERE CallID = ?;
                `;

                db.query(updateCallQuery, [transcriptID, callID], (err) => {
                    if (err) {
                        console.error('Error updating meetingCall with TranscriptID:', err);
                        return res.status(500).json({ message: 'Error linking transcript to call' });
                    }

                    // Step 5: Initialize empty records in AudioResults and VideoResults for the new call
                    const insertAudioResultsQuery = `
                        INSERT INTO AudioResults (CallID, Sentiment, Timestamp)
                        VALUES (?, ?, ?);
                    `;
                    const insertVideoResultsQuery = `
                        INSERT INTO VideoResults (CallID, BodyAlignment, GazeDirection, Emotion, Timestamp)
                        VALUES (?, ?, ?, ?, ?);
                    `;

                    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');

                    db.query(insertAudioResultsQuery, [callID, 'neutral', timestamp], (err) => {
                        if (err) {
                            console.error('Error creating audio results (FROM start-call ENDPOINT):', err);
                            return res.status(500).json({ message: 'Error creating audio results (FROM start-call ENDPOINT)' });
                        }

                        db.query(insertVideoResultsQuery, [callID, 'Aligned', 'Center', 'Neutral', timestamp], (err) => {
                            if (err) {
                                console.error('Error creating video results (FROM start-call ENDPOINT):', err);
                                return res.status(500).json({ message: 'Error creating video results (FROM start-call ENDPOINT)' });
                            }

                            // Step 6: Respond back with success message and CallID
                            res.json({
                                message: 'Call started successfully',
                                callID: callID,
                                startTime: startTime,
                                transcriptName: transcriptName
                            });
                        });
                    });
                });
            });
        });
    });
});

/* ============================================================================================ */

// Ending a call
router.post('/end-call', (req, res) => {
    const { callID } = req.body;  // Expect callID from frontend

    // Update the EndTime column with the current time
    const endTime = moment().format('YYYY-MM-DD HH:mm:ss');
    const updateCallQuery = `
        UPDATE meetingCall
        SET EndTime = ?
        WHERE CallID = ?;
    `;

    db.query(updateCallQuery, [endTime, callID], (err, result) => {
        if (err) {
            console.error('Error ending call (FROM end-call ENDPOINT):', err);
            return res.status(500).json({ message: 'Error ending call (FROM end-call ENDPOINT)' });
        }

        res.json({
            message: 'Call ended successfully',
            callID: callID,
            endTime: endTime
        });
    });
});

/* ============================================================================================ */

module.exports = router;