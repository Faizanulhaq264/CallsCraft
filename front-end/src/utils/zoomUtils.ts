import { KJUR } from 'jsrsasign';
import axios from 'axios';

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

/**
 * Start the Zoom bot docker container
 * @param meetingNumber - The meeting number to join
 * @param password - The meeting password
 * @returns Promise resolving to the API response
 */
export async function startZoomBot(meetingNumber: string, password: string): Promise<{success: boolean; error?: string; containerId?: string}> {
  try {
    const response = await axios.post('http://localhost:4000/api/start-zoom-bot', {
      meetingNumber,
      password
    });
    return response.data;
  } catch (error) {
    console.error('Error starting Zoom bot:', error);
    return { success: false, error: (error as any).message };
  }
}

/**
 * Stop the running Zoom bot docker container
 * @returns Promise resolving to the API response
 */
export async function stopZoomBot(): Promise<{success: boolean; error?: string}> {
  try {
    const response = await axios.post('http://localhost:4000/api/stop-zoom-bot');
    return response.data;
  } catch (error) {
    console.error('Error stopping Zoom bot:', error);
    return { success: false, error: (error as any).message };
  }
}

// Environment variable constants for Zoom credentials
export const ZOOM_SDK_KEY = 'J4YkTrEqTHS6lWOTc9zDYQ'; // Replace with your environment variable setup
export const ZOOM_SDK_SECRET = 'l0LeSguzPN8sHLaucxAdhcEXkpRV6VOD'; // Replace with your environment variable setup