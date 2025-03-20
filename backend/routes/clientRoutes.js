const express = require('express');
const router = express.Router();
const db = require('../db/db-configs');

/**
 * @route   GET /api/clients
 * @desc    Get all clients for a user with their last call and task stats
 * @access  Private
 */
router.get('/clients', (req, res) => {
    const { userID } = req.query;
    
    if (!userID) {
        return res.status(400).json({ message: 'UserID is required' });
    }
    
    const query = `
        SELECT 
            c.ClientID as id,
            c.Name as name,
            (
                SELECT DATE_FORMAT(MAX(StartTime), '%Y-%m-%d')
                FROM meetingCall
                WHERE ClientID = c.ClientID
            ) as lastCall,
            (
                SELECT JSON_OBJECT(
                    'completed', COUNT(CASE WHEN Status = 1 THEN 1 ELSE NULL END),
                    'incomplete', COUNT(CASE WHEN Status = 0 THEN 1 ELSE NULL END)
                )
                FROM Task
                WHERE ClientID = c.ClientID
            ) as tasks
        FROM Client c
        WHERE c.UserID = ?
        ORDER BY c.Name ASC;
    `;
    
    db.query(query, [userID], (err, results) => {
        if (err) {
            console.error('Error fetching clients:', err);
            return res.status(500).json({ message: 'Error fetching clients' });
        }
        
        // Process results to parse tasks JSON
        const clients = results.map(client => {
            try {
                return {
                    ...client,
                    // Add empty company field for frontend compatibility
                    company: "",
                    tasks: typeof client.tasks === 'string' 
                        ? JSON.parse(client.tasks)
                        : client.tasks || { completed: 0, incomplete: 0 }
                };
            } catch (e) {
                console.error('Error parsing tasks JSON:', e);
                return {
                    ...client,
                    company: "",
                    tasks: { completed: 0, incomplete: 0 }
                };
            }
        });
        
        res.json(clients);
    });
});

/**
 * @route   GET /api/client/:id
 * @desc    Get detailed information about a specific client
 * @access  Private
 */
router.get('/client/:id', (req, res) => {
    const { id } = req.params;
    const { userID } = req.query;
    
    if (!userID) {
        return res.status(400).json({ message: 'UserID is required' });
    }
    
    // Get basic client info
    const clientQuery = `
        SELECT 
            c.ClientID as id,
            c.Name as name
        FROM Client c
        WHERE c.ClientID = ? AND c.UserID = ?;
    `;
    
    // Get the most recent call info
    const lastCallQuery = `
        SELECT 
            CallID,
            DATE_FORMAT(StartTime, '%Y-%m-%d') as date,
            CONCAT(TIMESTAMPDIFF(MINUTE, StartTime, 
                CASE WHEN EndTime IS NULL THEN NOW() ELSE EndTime END
            ), ' min') as duration
        FROM meetingCall
        WHERE ClientID = ?
        ORDER BY StartTime DESC
        LIMIT 1;
    `;
    
    // Get call notes for the most recent call
    const notesQuery = `
        SELECT Content as notes
        FROM Note
        WHERE CallID = ?
        ORDER BY Timestamp DESC
        LIMIT 1;
    `;
    
    // Get tasks for this client
    const tasksQuery = `
        SELECT 
            TaskID as id,
            Goal as text,
            Status as completed
        FROM Task
        WHERE ClientID = ?
        ORDER BY TaskID DESC;
    `;
    
    // Execute client query
    db.query(clientQuery, [id, userID], (err, clientResults) => {
        if (err) {
            console.error('Error fetching client:', err);
            return res.status(500).json({ message: 'Error fetching client' });
        }
        
        if (clientResults.length === 0) {
            return res.status(404).json({ message: 'Client not found' });
        }
        
        const client = {
            ...clientResults[0],
            company: "",
            email: "",
            phone: ""
        };
        
        // Execute last call query
        db.query(lastCallQuery, [id], (err, callResults) => {
            if (err) {
                console.error('Error fetching last call:', err);
                return res.status(500).json({ message: 'Error fetching last call' });
            }
            
            let lastCall = null;
            let lastCallID = null;
            
            if (callResults.length > 0) {
                lastCallID = callResults[0].CallID;
                lastCall = {
                    date: callResults[0].date,
                    duration: callResults[0].duration,
                    notes: ''
                };
                
                // Get notes if we have a call
                db.query(notesQuery, [lastCallID], (err, notesResults) => {
                    if (err) {
                        console.error('Error fetching notes:', err);
                    } else if (notesResults.length > 0) {
                        lastCall.notes = notesResults[0].notes;
                    }
                    
                    // Get tasks
                    db.query(tasksQuery, [id], (err, tasksResults) => {
                        if (err) {
                            console.error('Error fetching tasks:', err);
                            return res.status(500).json({ message: 'Error fetching tasks' });
                        }
                        
                        let tasks = tasksResults || [];
                        
                        // Return complete client data
                        res.json({
                            ...client,
                            lastCall,
                            tasks,
                            analytics: {
                                attention: [],
                                mood: [],
                                valueInternalization: [],
                                cognitiveResonance: []
                            }
                        });
                    });
                });
            } else {
                // No calls found, return client with empty lastCall
                lastCall = {
                    date: '',
                    duration: '',
                    notes: ''
                };
                
                // Get tasks
                db.query(tasksQuery, [id], (err, tasksResults) => {
                    if (err) {
                        console.error('Error fetching tasks:', err);
                        return res.status(500).json({ message: 'Error fetching tasks' });
                    }
                    
                    let tasks = tasksResults || [];
                    
                    // Return client data without call info
                    res.json({
                        ...client,
                        lastCall,
                        tasks,
                        analytics: {
                            attention: [],
                            mood: [],
                            valueInternalization: [],
                            cognitiveResonance: []
                        }
                    });
                });
            }
        });
    });
});

/**
 * @route   POST /api/client
 * @desc    Create a new client
 * @access  Private
 */
router.post('/client', (req, res) => {
    const { name, userID } = req.body;
    
    if (!name || !userID) {
        return res.status(400).json({ message: 'Name and UserID are required' });
    }
    
    const query = `
        INSERT INTO Client (Name, UserID) 
        VALUES (?, ?);
    `;
    
    db.query(query, [name, userID], (err, results) => {
        if (err) {
            console.error('Error creating client:', err);
            return res.status(500).json({ message: 'Error creating client' });
        }
        
        res.status(201).json({ 
            id: results.insertId,
            name,
            company: ""
        });
    });
});

/**
 * @route   PUT /api/client/:id
 * @desc    Update a client name
 * @access  Private
 */
router.put('/client/:id', (req, res) => {
    const { id } = req.params;
    const { name, userID } = req.body;
    
    if (!name || !userID) {
        return res.status(400).json({ message: 'Name and UserID are required' });
    }
    
    // First check if the client belongs to this user
    const checkQuery = `
        SELECT ClientID FROM Client WHERE ClientID = ? AND UserID = ?;
    `;
    
    db.query(checkQuery, [id, userID], (err, results) => {
        if (err) {
            console.error('Error checking client:', err);
            return res.status(500).json({ message: 'Error checking client' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ message: 'Client not found or not authorized' });
        }
        
        // Client belongs to this user, proceed with update
        const updateQuery = `
            UPDATE Client 
            SET Name = ?
            WHERE ClientID = ?;
        `;
        
        db.query(updateQuery, [name, id], (err, updateResults) => {
            if (err) {
                console.error('Error updating client:', err);
                return res.status(500).json({ message: 'Error updating client' });
            }
            
            res.json({ 
                id: parseInt(id),
                name,
                company: ""
            });
        });
    });
});

/**
 * @route   DELETE /api/client/:id
 * @desc    Delete a client
 * @access  Private
 */
router.delete('/client/:id', (req, res) => {
    const { id } = req.params;
    const { userID } = req.query;
    
    if (!userID) {
        return res.status(400).json({ message: 'UserID is required' });
    }
    
    // First check if the client belongs to this user
    const checkQuery = `
        SELECT ClientID FROM Client WHERE ClientID = ? AND UserID = ?;
    `;
    
    db.query(checkQuery, [id, userID], (err, results) => {
        if (err) {
            console.error('Error checking client:', err);
            return res.status(500).json({ message: 'Error checking client' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ message: 'Client not found or not authorized' });
        }
        
        // Delete tasks related to this client first
        const deleteTasksQuery = `DELETE FROM Task WHERE ClientID = ?;`;
        
        db.query(deleteTasksQuery, [id], (err) => {
            if (err) {
                console.error('Error deleting client tasks:', err);
                return res.status(500).json({ message: 'Error deleting client tasks' });
            }
            
            // Now delete the client
            const deleteClientQuery = `DELETE FROM Client WHERE ClientID = ?;`;
            
            db.query(deleteClientQuery, [id], (err) => {
                if (err) {
                    console.error('Error deleting client:', err);
                    return res.status(500).json({ message: 'Error deleting client' });
                }
                
                res.json({ message: 'Client deleted successfully' });
            });
        });
    });
});

/**
 * @route   POST /api/client/:id/task
 * @desc    Add a new task for a client
 * @access  Private
 */
router.post('/client/:id/task', (req, res) => {
    const { id } = req.params;
    const { text, callID, userID } = req.body;
    
    if (!text || !userID) {
        return res.status(400).json({ message: 'Task text and UserID are required' });
    }
    
    const query = `
        INSERT INTO Task (Goal, Status, CallID, UserID, ClientID) 
        VALUES (?, 0, ?, ?, ?);
    `;
    
    db.query(query, [text, callID || null, userID, id], (err, results) => {
        if (err) {
            console.error('Error creating task:', err);
            return res.status(500).json({ message: 'Error creating task' });
        }
        
        res.status(201).json({ 
            id: results.insertId,
            text,
            completed: false,
            clientID: parseInt(id),
            callID: callID || null
        });
    });
});

/**
 * @route   PUT /api/task/:id
 * @desc    Update a task (toggle completion)
 * @access  Private
 */
router.put('/task/:id', (req, res) => {
    const { id } = req.params;
    const { status, userID } = req.body;
    
    if (typeof status !== 'boolean' && status !== 0 && status !== 1) {
        return res.status(400).json({ message: 'Task status must be a boolean value' });
    }
    
    if (!userID) {
        return res.status(400).json({ message: 'UserID is required' });
    }
    
    // First check if the task belongs to this user
    const checkQuery = `
        SELECT TaskID FROM Task WHERE TaskID = ? AND UserID = ?;
    `;
    
    db.query(checkQuery, [id, userID], (err, results) => {
        if (err) {
            console.error('Error checking task:', err);
            return res.status(500).json({ message: 'Error checking task' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ message: 'Task not found or not authorized' });
        }
        
        // Task belongs to this user, proceed with update
        const updateQuery = `
            UPDATE Task SET Status = ? WHERE TaskID = ?;
        `;
        
        // Convert boolean status to 0/1 for MySQL
        const statusValue = status === true || status === 1 ? 1 : 0;
        
        db.query(updateQuery, [statusValue, id], (err, updateResults) => {
            if (err) {
                console.error('Error updating task:', err);
                return res.status(500).json({ message: 'Error updating task' });
            }
            
            res.json({ 
                id: parseInt(id),
                completed: Boolean(statusValue)
            });
        });
    });
});

/**
 * @route   GET /api/client-last-call-id
 * @desc    Get the most recent call ID for a specific client
 * @access  Private
 */
router.get('/client-last-call-id', (req, res) => {
    const { clientID, userID } = req.query;
    
    if (!clientID || !userID) {
        return res.status(400).json({ message: 'Client ID and User ID are required' });
    }
    
    const query = `
        SELECT 
            CallID as callID
        FROM meetingCall
        WHERE ClientID = ? AND UserID = ?
        ORDER BY StartTime DESC
        LIMIT 1;
    `;
    
    db.query(query, [clientID, userID], (err, results) => {
        if (err) {
            console.error('Error fetching last call ID:', err);
            return res.status(500).json({ message: 'Error fetching last call ID' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ message: 'No calls found for this client' });
        }
        // console.log(results);
        res.json(results[0]);
    });
});

module.exports = router;