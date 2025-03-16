const KJUR = require('jsrsasign');

/**
 * Generates a JWT signature for Zoom Meeting SDK authentication
 * Using Zoom's official recommended approach with jsrsasign
 * @param {string} sdkKey - Your Zoom SDK key
 * @param {string} sdkSecret - Your Zoom SDK secret
 * @param {string|number} meetingNumber - The meeting number to join
 * @param {number} role - User role (1 = host, 0 = attendee)
 * @returns {string} JWT signature string
 */
function generateSignature(sdkKey, sdkSecret, meetingNumber, role = 1) {
  const iat = Math.round(new Date().getTime() / 1000) - 30;
  const exp = iat + 60 * 60 * 24; // 24 hours
  
  // Header
  const oHeader = { alg: 'HS256', typ: 'JWT' };
  
  // Payload
  const oPayload = {
    sdkKey: sdkKey,
    appKey: sdkKey, // appKey is the same as sdkKey
    mn: meetingNumber,
    role: role,
    iat: iat,
    exp: exp,
    tokenExp: exp
  };
  
  // Sign the token using KJUR (jsrsasign)
  const sHeader = JSON.stringify(oHeader);
  const sPayload = JSON.stringify(oPayload);
  const sdkJWT = KJUR.jws.JWS.sign('HS256', sHeader, sPayload, sdkSecret);
  
  return sdkJWT;
}

module.exports = { generateSignature };