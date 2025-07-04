const KJUR = require('jsrsasign');
const crypto = require('crypto');
require('dotenv').config({ path: '../.env' });


/* =================================================================================== */
// Function to validate password strength
function isPasswordStrong(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChars;
}

/* =================================================================================== */
// Function to validate email format
function isEmailValid(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/* =================================================================================== */
// Function to generate Zoom SDK JWT token
function generateZoomToken(meetingNumber, role) {
    const key = process.env.ZOOM_MEETING_SDK_KEY;
    const secret = process.env.ZOOM_MEETING_SDK_SECRET;

    const iat = Math.round(new Date().getTime() / 1000) - 30;
    const exp = iat + 60 * 60 * 24;
    const oHeader = { alg: 'HS256', typ: 'JWT' };

    const oPayload = {
        sdkKey: key,
        appKey: key,
        mn: meetingNumber,
        role: role,
        iat: iat,
        exp: exp,
        tokenExp: exp
    };

    const sHeader = JSON.stringify(oHeader);
    const sPayload = JSON.stringify(oPayload);
    const sdkJWT = KJUR.jws.JWS.sign('HS256', sHeader, sPayload, secret);
    return sdkJWT;
}

/* =================================================================================== */
// Encryption function
function encrypt(text) {
    // Convert text to string if it's not already
    const textString = String(text);
    
    // Get encryption key and IV from environment variables
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const iv = Buffer.from(process.env.IV, 'hex');
    
    // Create cipher and encrypt
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(textString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

// Decryption function
function decrypt(text) {
    // Get encryption key and IV from environment variables
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const iv = Buffer.from(process.env.IV, 'hex');
    
    // Create decipher and decrypt
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

/* =================================================================================== */
module.exports = {
    isPasswordStrong,
    isEmailValid,
    generateZoomToken,
    encrypt,
    decrypt
};