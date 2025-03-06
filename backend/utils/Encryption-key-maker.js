/* 
    This file is used to generate a random encryption key and initialization vector (IV) for encrypting and decrypting data.
    The encryption key and IV are used in the encryption and decryption functions in the utility-functions.js file.
    The encryption key and IV should be kept secure and not shared publicly.
    This file has already been used to generate the encryption key and IV, and the values have been stored in the .env file.
    No need to run this file again unless you want to generate new encryption key and IV values.
*/

const crypto = require('crypto');

// Generate a 32-byte encryption key
const encryptionKey = crypto.randomBytes(32).toString('hex');
console.log('Encryption Key:', encryptionKey);

// Generate a 16-byte initialization vector (IV)
const iv = crypto.randomBytes(16).toString('hex');
console.log('Initialization Vector (IV):', iv);