const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db/db-configs');  // Import the database connection
const { isEmailValid, isPasswordStrong } = require('../utils/utility-functions');  // Import utility functions

const router = express.Router();
const saltRounds = 10;

// User Sign Up
router.post('/signup', (req, res) => {
    const { email, password, name } = req.body;

    // Validate the email
    if (!isEmailValid(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate the password
    if (!isPasswordStrong(password)) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long and include uppercase, lowercase, numbers, and special characters.' });
    }

    // Check if the email is already registered
    const checkEmailQuery = `
        SELECT * FROM User WHERE Email = ?;
    `;

    db.query(checkEmailQuery, [email], (err, results) => {
        if (err) {
            console.error('Error checking email (FROM signup ENDPOINT):', err);
            return res.status(500).json({ message: 'Error checking email (FROM signup ENDPOINT)' });
        }

        if (results.length > 0) {
            return res.status(400).json({ message: 'Email is already registered' });
        }

        // Hash the password before storing it in the database
        bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
            if (err) {
                console.error('Error hashing password (FROM signup ENDPOINT):', err);
                return res.status(500).json({ message: 'Error signing up user' });
            }

            // First, create a default CRM entry for the user
            const insertCRMQuery = `
                INSERT INTO CRM (CRMName)
                VALUES (?);
            `;

            db.query(insertCRMQuery, [`${name}'s CRM`], (err, crmResult) => {
                if (err) {
                    console.error('Error creating CRM (FROM signup ENDPOINT):', err);
                    return res.status(500).json({ message: 'Error creating CRM for user' });
                }

                const crmID = crmResult.insertId;  // Get the generated CRMID

                // Now insert the user with the CRMID
                const insertUserQuery = `
                    INSERT INTO User (Name, Email, Password, CRMID)
                    VALUES (?, ?, ?, ?);
                `;

                db.query(insertUserQuery, [name, email, hashedPassword, crmID], (err, result) => {
                    if (err) {
                        console.error('Error signing up user (FROM signup ENDPOINT):', err);
                        return res.status(500).json({ message: 'Error signing up user (FROM signup ENDPOINT)' });
                    }

                    console.log('User signed up:', result);

                    const userID = result.insertId;  // Get the generated UserID
                    res.json({
                        message: 'User signed up successfully',
                        id: userID,
                        name: name,
                        email: email,
                        crmID: crmID
                    });
                });
            });
        });
    });
});

// User Login
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    const selectUserQuery = `
        SELECT * FROM User WHERE Email = ?;
    `;

    db.query(selectUserQuery, [email], (err, results) => {
        if (err) {
            console.error('Error logging in user (FROM login ENDPOINT):', err);
            return res.status(500).json({ message: 'Error logging in user (FROM login ENDPOINT)' });
        }

        if (results.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = results[0];

        // Compare the provided password with the hashed password in the database
        bcrypt.compare(password, user.Password, (err, isMatch) => {
            if (err) {
                console.error('Error comparing passwords:', err);
                return res.status(500).json({ message: 'Error logging in user' });
            }

            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            res.json({
                message: 'User logged in successfully',
                id: user.UserID,
                name: user.Name,
                email: user.Email,
                crmID: user.CRMID
            });
        });
    });
});

// Create Client
router.post('/create-client', (req, res) => {
    const { clientName, userID } = req.body;  // Expect clientName and userID from frontend

    const insertClientQuery = `
        INSERT INTO Client (Name, UserID)
        VALUES (?, ?);
    `;

    db.query(insertClientQuery, [clientName, userID], (err, result) => {
        if (err) {
            console.error('Error creating client (FROM create-client ENDPOINT):', err);
            return res.status(500).json({ message: 'Error creating client (FROM create-client ENDPOINT)' });
        }

        const clientID = result.insertId;  // Get the generated ClientID
        res.json({          // Respond back with success message and ClientID
            message: 'Client created successfully',
            clientID: clientID
        });
    });
});

module.exports = router;