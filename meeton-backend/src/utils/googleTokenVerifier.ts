import { AuthenticationError } from './errors';

/**
 * Standalone utility function to verify Google access token
 */
export async function verifyGoogleToken(accessToken: string): Promise<any> {
  try {
    const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`);
    
    if (!response.ok) {
      throw new AuthenticationError('Invalid Google access token');
    }
    
    const userData = await response.json();
    
    if (!userData.email) {
      throw new AuthenticationError('Google token does not contain email');
    }
    
    return userData;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    console.error('Google token verification error:', error);
    throw new AuthenticationError('Google token verification failed');
  }
} 