const express = require('express');
const moment = require('moment');
const db = require('../db/db-configs');  // Import the database connection
const fs = require('fs');
const path = require('path');
const axios = require('axios');

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

                        db.query(insertVideoResultsQuery, [callID, 'Aligned', 'Center-Center', 'neutral', timestamp], (err) => {
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
// Update note content
router.post('/update-note', (req, res) => {
    const { callID, content } = req.body;
    
    if (!callID) {
        return res.status(400).json({ message: 'CallID is required' });
    }
    
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    
    // Query to update the existing note for this call
    const updateNoteQuery = `
        UPDATE Note 
        SET Content = ?, Timestamp = ? 
        WHERE CallID = ?;
    `;
    
    db.query(updateNoteQuery, [content, timestamp, callID], (err, result) => {
        if (err) {
            console.error('Error updating note:', err);
            return res.status(500).json({ message: 'Error updating note' });
        }
        
        // Check if any rows were affected
        if (result.affectedRows === 0) {
            // If no rows were affected, the note might not exist, so create it
            const insertNoteQuery = `
                INSERT INTO Note (Content, Timestamp, CallID)
                VALUES (?, ?, ?);
            `;
            
            db.query(insertNoteQuery, [content, timestamp, callID], (err, insertResult) => {
                if (err) {
                    console.error('Error creating note:', err);
                    return res.status(500).json({ message: 'Error creating note' });
                }
                
                res.json({
                    message: 'Note created successfully',
                    noteID: insertResult.insertId,
                    timestamp: timestamp
                });
            });
        } else {
            res.json({
                message: 'Note updated successfully',
                timestamp: timestamp
            });
        }
    });
});
/* ============================================================================================ */

// Add task for a call
router.post('/add-tasks', (req, res) => {
    const { callID, userID, clientID, tasks } = req.body;
    
    if (!callID || !userID || !tasks || !tasks.length) {
        return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Create placeholders for multiple INSERT
    const placeholders = tasks.map(() => '(?, ?, ?, ?, ?)').join(', ');
    
    // Flatten values for the query
    const values = tasks.flatMap(task => [
        task, 
        false, // initial status is false (not completed)
        callID,
        userID,
        clientID
    ]);
    
    const insertTasksQuery = `
        INSERT INTO Task (Goal, Status, CallID, UserID, ClientID)
        VALUES ${placeholders};
    `;
    
    db.query(insertTasksQuery, values, (err, result) => {
        if (err) {
            console.error('Error adding tasks:', err);
            return res.status(500).json({ message: 'Error adding tasks' });
        }
        
        res.json({
            message: 'Tasks added successfully',
            taskCount: tasks.length,
            firstTaskId: result.insertId
        });
    });
});

/* ============================================================================================ */
// Analyze call accomplishments and update status in database
router.get('/analyze-accomplishments', async (req, res) => {
    const { callID } = req.query;
    
    if (!callID) {
        return res.status(400).json({ message: 'CallID is required' });
    }
    
    try {
        // 1. Get tasks/accomplishments for this call (include TaskID)
        const getTasksQuery = `
            SELECT TaskID, Goal 
            FROM Task 
            WHERE CallID = ?;
        `;
        
        db.query(getTasksQuery, [callID], async (err, tasks) => {
            if (err) {
                console.error('Error fetching tasks:', err);
                return res.status(500).json({ message: 'Error fetching tasks' });
            }
            
            if (!tasks || tasks.length === 0) {
                return res.json({ 
                    message: 'No accomplishments found for this call',
                    completed: [],
                    incomplete: [] 
                });
            }
            
            // 2. Get transcript from the file
            const transcriptFileName = `transcript_call_id_${callID}.txt`;
            const transcriptPath = path.join(__dirname, '..', 'DOWNLOADABLES', transcriptFileName);
            
            if (!fs.existsSync(transcriptPath)) {
                return res.status(404).json({ message: 'Transcript file not found' });
            }
            
            const transcriptContent = fs.readFileSync(transcriptPath, 'utf8');
            
            // 3. Format accomplishments for the prompt
            const accomplishmentsList = tasks.map(task => task.Goal).join('\n');
            
            // 4. Call Gemini API
            const GEMINI_API_KEY = "AIzaSyBolXPg8KntJZJ0sJAoGfx2Bx49gRWYYcs";//process.env.GEMINI_API_KEY;
            if (!GEMINI_API_KEY) {
                return res.status(500).json({ message: 'Gemini API key not configured' });
            }
            
            try {
                const apiResponse = await axios.post(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
                    {
                        contents: [{
                            role: "user",
                            parts: [{
                                text: `you are an expert at checking accomplishments of the host that they set with their client before a call. Use the following accomplishment list and call transcript and analyze every accomplishment with the full transcription of the call to be sure that host was able to complete the accomplishment during the call or not and as a dictionary return accomplishments completed and not completed:\nAccomplishments:\n${accomplishmentsList}\nTranscript:\n${transcriptContent}`
                            }]
                        }],
                        generationConfig: {
                            temperature: 0,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 8192,
                            responseMimeType: "application/json",
                            responseSchema: {
                                type: "object",
                                properties: {
                                    completed: {
                                        type: "array",
                                        items: {
                                            type: "string"
                                        }
                                    },
                                    incomplete: {
                                        type: "array",
                                        items: {
                                            type: "string"
                                        }
                                    }
                                },
                                required: [
                                    "completed",
                                    "incomplete"
                                ]
                            }
                        }
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                );
                
                // Extract the result from the Gemini API response
                console.log('Gemini API response:', apiResponse);
                const result = apiResponse.data.candidates[0].content.parts[0].text;
                console.log('Gemini API result:', result , "type of ", typeof result);
                let parsedResult;
                
                try {
                    // The result might be JSON or have JSON inside text
                    if (typeof result === 'string') {
                        // Try to extract JSON from the string
                        const jsonMatch = result.match(/(\{[\s\S]*\})/);
                        if (jsonMatch) {
                            parsedResult = JSON.parse(jsonMatch[0]);
                        } else {
                            parsedResult = JSON.parse(result);
                        }
                    } else if (result.text) {
                        // If it's an object with text property
                        const jsonMatch = result.text.match(/(\{[\s\S]*\})/);
                        if (jsonMatch) {
                            parsedResult = JSON.parse(jsonMatch[0]);
                        }
                    } else {
                        // If it's already a proper object
                        parsedResult = result;
                    }
                    
                    const completedTasks = parsedResult.completed || [];
                    const incompleteTasks = parsedResult.incomplete || [];
                    
                    // 5. Update database with task status
                    const updatePromises = [];
                    
                    // Create a map for easy task lookup
                    const taskMap = tasks.reduce((map, task) => {
                        map[task.Goal] = task.TaskID;
                        return map;
                    }, {});
                    
                    // Update completed tasks
                    completedTasks.forEach(taskText => {
                        // Find the most likely matching task from our database
                        const bestMatch = findBestTaskMatch(taskText, tasks.map(t => t.Goal));
                        
                        if (bestMatch && taskMap[bestMatch]) {
                            const updateQuery = `
                                UPDATE Task 
                                SET Status = TRUE 
                                WHERE TaskID = ?;
                            `;
                            
                            const updatePromise = new Promise((resolve, reject) => {
                                db.query(updateQuery, [taskMap[bestMatch]], (err, result) => {
                                    if (err) {
                                        console.error('Error updating task status:', err);
                                        reject(err);
                                    } else {
                                        resolve(result);
                                    }
                                });
                            });
                            
                            updatePromises.push(updatePromise);
                        }
                    });
                    
                    // Update incomplete tasks
                    incompleteTasks.forEach(taskText => {
                        // Find the most likely matching task from our database
                        const bestMatch = findBestTaskMatch(taskText, tasks.map(t => t.Goal));
                        
                        if (bestMatch && taskMap[bestMatch]) {
                            const updateQuery = `
                                UPDATE Task 
                                SET Status = FALSE 
                                WHERE TaskID = ?;
                            `;
                            
                            const updatePromise = new Promise((resolve, reject) => {
                                db.query(updateQuery, [taskMap[bestMatch]], (err, result) => {
                                    if (err) {
                                        console.error('Error updating task status:', err);
                                        reject(err);
                                    } else {
                                        resolve(result);
                                    }
                                });
                            });
                            
                            updatePromises.push(updatePromise);
                        }
                    });
                    
                    // Wait for all updates to complete
                    await Promise.all(updatePromises).catch(err => {
                        console.error('Error updating task statuses:', err);
                    });
                    
                    res.json({
                        message: 'Analysis completed and task statuses updated',
                        completed: completedTasks,
                        incomplete: incompleteTasks
                    });
                } catch (parseError) {
                    console.error('Error parsing Gemini API result:', parseError);
                    res.status(500).json({ 
                        message: 'Error processing API response',
                        rawResponse: result 
                    });
                }
            } catch (apiError) {
                console.error('Error calling Gemini API:', apiError.response?.data || apiError.message);
                res.status(500).json({ message: 'Error analyzing accomplishments' });
            }
        });
    } catch (error) {
        console.error('Error in analyze-accomplishments endpoint:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Helper function to find the best matching task
// This handles slight variations in text that might come from the LLM
function findBestTaskMatch(taskText, dbTasks) {
    // Simple algorithm: First try exact match, then case-insensitive match,
    // then substring match, then longest common words match
    
    // Exact match
    const exactMatch = dbTasks.find(t => t === taskText);
    if (exactMatch) return exactMatch;
    
    // Case-insensitive match
    const caseInsensitiveMatch = dbTasks.find(t => 
        t.toLowerCase() === taskText.toLowerCase());
    if (caseInsensitiveMatch) return caseInsensitiveMatch;
    
    // Substring match (task is contained in LLM result or vice versa)
    const substringMatch = dbTasks.find(t => 
        t.toLowerCase().includes(taskText.toLowerCase()) || 
        taskText.toLowerCase().includes(t.toLowerCase()));
    if (substringMatch) return substringMatch;
    
    // Word similarity match
    let bestMatchScore = 0;
    let bestMatch = null;
    
    const taskWords = taskText.toLowerCase().split(/\s+/);
    
    dbTasks.forEach(dbTask => {
        const dbWords = dbTask.toLowerCase().split(/\s+/);
        let matchCount = 0;
        
        // Count matching words
        taskWords.forEach(word => {
            if (dbWords.includes(word) && word.length > 2) { // Only count meaningful words
                matchCount++;
            }
        });
        
        // Calculate score as percentage of words matched
        const score = matchCount / Math.max(taskWords.length, dbWords.length);
        
        if (score > bestMatchScore && score > 0.5) { // At least 50% word match
            bestMatchScore = score;
            bestMatch = dbTask;
        }
    });
    
    return bestMatch;
}
/* ============================================================================================ */

/* ============================================================================================ */
// Generate call summary from transcript
router.get('/generate-summary', async (req, res) => {
    const { callID } = req.query;
    
    if (!callID) {
        return res.status(400).json({ message: 'CallID is required' });
    }
    
    try {
        // 1. Get transcript from the file
        const transcriptFileName = `transcript_call_id_${callID}.txt`;
        const transcriptPath = path.join(__dirname, '..', 'DOWNLOADABLES', transcriptFileName);
        
        if (!fs.existsSync(transcriptPath)) {
            return res.status(404).json({ message: 'Transcript file not found' });
        }
        
        const transcriptContent = fs.readFileSync(transcriptPath, 'utf8');
        
        // 2. Create Summaries directory if it doesn't exist
        const summariesDir = path.join(__dirname, '..', 'Summaries');
        if (!fs.existsSync(summariesDir)) {
            fs.mkdirSync(summariesDir, { recursive: true });
        }
        
        // 3. Call Gemini API
        console.log("Reading env variable ", process.env.GEMINI_API_KEY);
        const GEMINI_API_KEY = "AIzaSyBolXPg8KntJZJ0sJAoGfx2Bx49gRWYYcs"; // Replace with process.env.GEMINI_API_KEY in production
        if (!GEMINI_API_KEY) {
            return res.status(500).json({ message: 'Gemini API key not configured' });
        }
        
        try {
            const apiResponse = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
                {
                    contents: [{
                        role: "user",
                        parts: [{
                            text: `you are an expert summary writer. You shall take transcript of the sales pitch call happening between the sales person host and client and extract the following details from the transcript and give it to me as a summary of points (making sure every new point is separated by \\n to denote a new line:
1. Client's Reaction to the Pitch:
   - How did the client respond to the salesperson's pitch?
   - Positive or negative feedback on the product or service.
   - Any areas of confusion or clarification requested.

2. Client's Intentions and Needs:
   - What does the client express about their goals or needs?
   - Are they looking to solve a problem, achieve a goal, or satisfy a specific requirement?
   - Any pain points or challenges they mention that the product could address.

3. Budget and Financial Considerations:
   - Does the client indicate their budget for the product/service?
   - Are there concerns about pricing, value, or ROI (Return on Investment)?
   
4. Objections or Concerns:
   - Any hesitations or objections the client raises.
   - Questions about product features, delivery time, support, or contracts.

5. Competitor Comparison:
   - Does the client mention competitors or compare your offering with other products/services?
   - How does the client view your product in relation to others?

6. Interest Level and Readiness to Buy:
   - How interested is the client in moving forward with the purchase?
   - Do they express a timeline for making a decision?

7. Action Items and Next Steps:
   - What are the agreed-upon next steps after the call (e.g., sending additional information, scheduling another meeting, offering a demo)?
   - Any commitments or follow-ups promised by either party.

8. Client's Contact Information and Decision-Makers:
   - Is there a mention of other key stakeholders or decision-makers involved?
   - Any details about who will make the final decision on the purchase.
   - Any mention of any dates or other details about the client (e.g email, cell number, office/home addresses etc)

Transcript:
${transcriptContent}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 8192,
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: "object",
                            properties: {
                                summary: {
                                    type: "string"
                                }
                            },
                            required: [
                                "summary"
                            ]
                        }
                    }
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            // 4. Extract and process the result
            console.log('Gemini API summary response:', apiResponse.data);
            const result = apiResponse.data.candidates[0].content.parts[0].text;
            let summary = '';
            
            try {
                // Parse the JSON response
                if (typeof result === 'string') {
                    // Try to extract JSON from the string if needed
                    const jsonMatch = result.match(/(\{[\s\S]*\})/);
                    if (jsonMatch) {
                        const parsedResult = JSON.parse(jsonMatch[0]);
                        summary = parsedResult.summary;
                    } else {
                        // Try parsing the entire result as JSON
                        try {
                            const parsedResult = JSON.parse(result);
                            summary = parsedResult.summary;
                        } catch (e) {
                            // If it's not valid JSON, use the raw text
                            summary = result;
                        }
                    }
                } else if (result.text) {
                    // If it's an object with text property
                    summary = result.text;
                } else {
                    // If it already has a summary property
                    summary = result.summary || JSON.stringify(result);
                }
                
                // 5. Replace \n with actual newlines for file writing
                const formattedSummary = summary.replace(/\\n/g, '\n');
                
                // 6. Write the summary to a file
                const summaryFileName = `summary_call_id_${callID}.txt`;
                const summaryPath = path.join(summariesDir, summaryFileName);
                
                fs.writeFileSync(summaryPath, formattedSummary);
                
                // 7. Return success
                res.json({
                    message: 'Summary generated successfully',
                    summary: formattedSummary,
                    summaryPath: summaryPath
                });
                
            } catch (parseError) {
                console.error('Error parsing Gemini API summary result:', parseError);
                res.status(500).json({ 
                    message: 'Error processing API response',
                    rawResponse: result 
                });
            }
        } catch (apiError) {
            console.error('Error calling Gemini API for summary:', apiError.response?.data || apiError.message);
            res.status(500).json({ message: 'Error generating summary' });
        }
    } catch (error) {
        console.error('Error in generate-summary endpoint:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
/* ============================================================================================ */

/* ============================================================================================ */
// Download file endpoint (serves files from DOWNLOADABLES or Summaries directory)
router.get('/download-file', (req, res) => {
    const { callID, fileType } = req.query;
    
    if (!callID || !fileType) {
        return res.status(400).json({ message: 'CallID and fileType are required' });
    }
    
    try {
        let filePath;
        let fileName;
        
        if (fileType === 'transcript') {
            fileName = `transcript_call_id_${callID}.txt`;
            filePath = path.join(__dirname, '..', 'DOWNLOADABLES', fileName);
        } else if (fileType === 'summary') {
            fileName = `summary_call_id_${callID}.txt`;
            filePath = path.join(__dirname, '..', 'Summaries', fileName);
        } else {
            return res.status(400).json({ message: 'Invalid fileType. Must be transcript or summary' });
        }
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: `${fileType} file not found` });
        }
        
        // Set headers for file download
        res.setHeader('Content-disposition', `attachment; filename=${fileName}`);
        res.setHeader('Content-type', 'text/plain');
        
        // Create read stream and pipe to response
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        
    } catch (error) {
        console.error(`Error downloading ${fileType}:`, error);
        res.status(500).json({ message: `Error downloading ${fileType}` });
    }
});
/* ============================================================================================ */

module.exports = router;