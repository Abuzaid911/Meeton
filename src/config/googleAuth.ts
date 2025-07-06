import { Platform } from 'react-native';
import { API_BASE_URL } from './api';

export const GOOGLE_CONFIG = {
  // iOS Configuration
  iosClientId: '38702126641-cs5p51cu1m4elmp9li0ptv2ot77k6pb9.apps.googleusercontent.com',
  
  // Android Configuration (from Google Cloud Console OAuth client)
  androidClientId: '38702126641-rn0e5nm88jrnm4cohi9m7dhnavuprmon.apps.googleusercontent.com',
  
  // Web Configuration (using Android client ID since it has SHA-1 configured)
  webClientId: '38702126641-rn0e5nm88jrnm4cohi9m7dhnavuprmon.apps.googleusercontent.com',
  
  // Backend endpoints - use same logic as main API config
  backendBaseUrl: API_BASE_URL,
    
  // OAuth endpoints
  authEndpoint: '/auth/google',
  callbackEndpoint: '/auth/google/callback',
  mobileAuthEndpoint: '/auth/google/mobile',
  
  // App scheme
  appScheme: 'meeton',
  
  // Scopes
  scopes: ['openid', 'profile', 'email'],
};

// Platform-specific Google Sign-In configuration
export const getGoogleSignInConfig = () => {
  if (Platform.OS === 'ios') {
    return {
      iosClientId: GOOGLE_CONFIG.iosClientId,
      webClientId: GOOGLE_CONFIG.webClientId,
      offlineAccess: true,
      hostedDomain: '',
      forceCodeForRefreshToken: true,
    };
  }
  
  // Android configuration - use only webClientId for direct Google OAuth
  if (Platform.OS === 'android') {
    return {
      webClientId: GOOGLE_CONFIG.webClientId,
      offlineAccess: true,
    };
  }
  
  // Fallback configuration
  return {
    webClientId: GOOGLE_CONFIG.webClientId,
    offlineAccess: true,
  };
};

// Export platform-specific configuration
export const isPlatformSupported = () => {
  return Platform.OS === 'ios' || Platform.OS === 'android';
};

export const getCurrentPlatform = () => {
  return Platform.OS;
}; 