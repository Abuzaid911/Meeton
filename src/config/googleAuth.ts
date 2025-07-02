import { Platform } from 'react-native';

export const GOOGLE_CONFIG = {
  // iOS Configuration
  iosClientId: '38702126641-cs5p51cu1m4elmp9li0ptv2ot77k6pb9.apps.googleusercontent.com',
  
  // Web Configuration (for backend) - from your existing setup
  webClientId: '38702126641-tpk5lqa0g5knb0ie73r0c0i29kha5019.apps.googleusercontent.com',
  
  // Backend endpoints
  backendBaseUrl: __DEV__ 
    ? 'http://localhost:3000/api' 
    : 'https://your-production-api.com/api',
    
  // OAuth endpoints
  authEndpoint: '/auth/google',
  callbackEndpoint: '/auth/google/callback',
  mobileAuthEndpoint: '/auth/google/mobile',
  
  // App scheme
  appScheme: 'meeton',
  
  // Scopes
  scopes: ['openid', 'profile', 'email'],
};

// iOS-specific Google Sign-In configuration
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
  
  // Android configuration (for future)
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