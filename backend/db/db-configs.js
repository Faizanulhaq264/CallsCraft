const mysql = require('mysql2');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// MySQL connection setup
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,  // MySQL username
    password: process.env.DB_PASSWORD,  // MySQL password
    database: process.env.DB_NAME  // The database name
});

module.exports = db;