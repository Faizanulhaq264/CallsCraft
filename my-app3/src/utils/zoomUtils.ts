import { KJUR } from 'jsrsasign';

/**
 * Generates a JWT signature for Zoom Meeting SDK authentication
 * @param sdkKey - Your Zoom SDK key
 * @param sdkSecret - Your Zoom SDK secret
 * @param meetingNumber - The meeting number to join
 * @param role - User role (1 = host, 0 = attendee)
 * @returns JWT signature string
 */
export function generateSignature(
  sdkKey: string,
  sdkSecret: string, 
  meetingNumber: string | number, 
  role: number = 1
): string {
  const iat = Math.round(new Date().getTime() / 1000) - 30;
  const exp = iat + 60 * 60 * 24; // 24 hours
  
  // Header
  const oHeader = { alg: 'HS256', typ: 'JWT' };
  
  // Payload
  const oPayload = {
    sdkKey,
    appKey: sdkKey, // appKey is the same as sdkKey
    mn: meetingNumber,
    role,
    iat,
    exp,
    tokenExp: exp
  };
  
  // Sign the token
  const sHeader = JSON.stringify(oHeader);
  const sPayload = JSON.stringify(oPayload);
  
  return KJUR.jws.JWS.sign('HS256', sHeader, sPayload, sdkSecret);
}

// Environment variable constants for Zoom credentials
// These should be set in your .env file
export const ZOOM_SDK_KEY = 'J4YkTrEqTHS6lWOTc9zDYQ'; // Replace with your environment variable setup
export const ZOOM_SDK_SECRET = 'l0LeSguzPN8sHLaucxAdhcEXkpRV6VOD'; // Replace with your environment variable setup