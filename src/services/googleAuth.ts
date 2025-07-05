import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Platform, Alert } from 'react-native';
import { GOOGLE_CONFIG, getGoogleSignInConfig, isPlatformSupported } from '../config/googleAuth';
import APIService from './api';

interface GoogleAuthResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: any;
  error?: string;
}

/**
 * Enhanced Google OAuth Service for iOS Native Authentication
 * Uses @react-native-google-signin for better iOS integration
 */
export class GoogleAuthService {
  private static isConfigured = false;
  
  /**
   * Initialize Google Sign-In configuration
   */
  static async configure(): Promise<void> {
    if (this.isConfigured) return;

    try {
      if (!isPlatformSupported()) {
        throw new Error('Platform not supported for Google Sign-In');
      }

      const config = getGoogleSignInConfig();
      
      console.log('🔧 Configuring Google Sign-In with:', {
        platform: Platform.OS,
        hasAndroidClientId: !!(config as any).androidClientId,
        hasIosClientId: !!(config as any).iosClientId,
        hasWebClientId: !!config.webClientId,
        androidClientId: (config as any).androidClientId?.substring(0, 20) + '...',
        webClientId: config.webClientId?.substring(0, 20) + '...',
        offlineAccess: config.offlineAccess,
      });
      
      await GoogleSignin.configure({
        ...config,
        scopes: GOOGLE_CONFIG.scopes,
      });
      
      this.isConfigured = true;
      console.log('✅ Google Sign-In configured for', Platform.OS);
    } catch (error) {
      console.error('❌ Google Sign-In configuration failed:', error);
      throw error;
    }
  }

  /**
   * Enhanced iOS Native Google Sign-In
   */
  static async signInWithGoogle(): Promise<GoogleAuthResult> {
    try {
      console.log('🔵 Starting Google Sign-In for', Platform.OS);
      console.log('📱 Package/Bundle ID check...');

      // Ensure Google Sign-In is configured
      await this.configure();

      // Check if device supports Google services
      console.log('🔍 Checking Google Play Services...');
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      console.log('✅ Google Play Services available');

      // Sign in with Google natively
      console.log('🔑 Attempting Google Sign-In...');
      const userInfo = await GoogleSignin.signIn();
      console.log('✅ Google Sign-In successful:', userInfo.data?.user?.email || 'Unknown user');

      // Get authentication tokens
      console.log('🎫 Getting authentication tokens...');
      const tokens = await GoogleSignin.getTokens();
      console.log('✅ Google tokens obtained');

      // Exchange Google tokens with your backend
      const backendAuth = await this.exchangeTokensWithBackend(tokens.accessToken);
      
      if (backendAuth.success) {
        return {
          success: true,
          user: backendAuth.user,
          accessToken: backendAuth.tokens.accessToken,
          refreshToken: backendAuth.tokens.refreshToken,
        };
      } else {
        return {
          success: false,
          error: backendAuth.error || 'Backend authentication failed',
        };
      }

    } catch (error: any) {
      console.error('❌ Google Sign-In failed:', error);
      console.error('❌ Error details:', {
        code: error.code,
        message: error.message,
        name: error.name,
        stack: error.stack?.substring(0, 200),
      });
      
      let errorMessage = 'Sign in failed';
      
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        errorMessage = 'Sign in was cancelled';
      } else if (error.code === statusCodes.IN_PROGRESS) {
        errorMessage = 'Sign in is already in progress';
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        errorMessage = 'Google Play Services not available';
      } else if (error.code === statusCodes.SIGN_IN_REQUIRED) {
        errorMessage = 'Sign in required';
      } else if (error.message?.includes('DEVELOPER_ERROR')) {
        errorMessage = 'Configuration error - please check SHA-1 fingerprint and package name';
      } else if (error.message?.includes('NETWORK_ERROR')) {
        errorMessage = 'Network error - please check your internet connection';
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Exchange Google access token with backend
   */
  private static async exchangeTokensWithBackend(googleAccessToken: string): Promise<{
    success: boolean;
    user?: any;
    tokens?: any;
    error?: string;
  }> {
    try {
      console.log('🔵 Exchanging Google token with backend...');

      // Send Google access token to your backend
      const response = await fetch(`${GOOGLE_CONFIG.backendBaseUrl}${GOOGLE_CONFIG.mobileAuthEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: googleAccessToken,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Backend authentication successful');

        // Store backend tokens
        await APIService.storeTokens({
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken,
        });

        return {
          success: true,
          user: data.data.user,
          tokens: {
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
          },
        };
      } else {
        console.error('❌ Backend authentication failed:', data);
        return {
          success: false,
          error: data.error?.message || 'Backend authentication failed',
        };
      }
    } catch (error) {
      console.error('❌ Backend token exchange failed:', error);
      return {
        success: false,
        error: 'Network error during authentication',
      };
    }
  }

  /**
   * Sign out from Google and clear all tokens
   */
  static async signOut(): Promise<void> {
    try {
      // Sign out from Google
      await GoogleSignin.signOut();
      
      // Clear backend tokens
      await APIService.logout();
      
      console.log('✅ Google Sign-Out successful');
    } catch (error) {
      console.error('❌ Google Sign-Out failed:', error);
    }
  }

  /**
   * Check if user is signed in to Google
   */
  static async isSignedIn(): Promise<boolean> {
    try {
      const userInfo = await GoogleSignin.getCurrentUser();
      return userInfo !== null;
    } catch (error) {
      console.error('❌ Google Sign-In status check failed:', error);
      return false;
    }
  }

  /**
   * Get current user from Google Sign-In
   */
  static async getCurrentUser(): Promise<any> {
    try {
      const userInfo = await GoogleSignin.getCurrentUser();
      return userInfo?.user || null;
    } catch (error) {
      console.error('❌ Get current Google user failed:', error);
      return null;
    }
  }

  /**
   * Revoke access and sign out completely
   */
  static async revokeAccess(): Promise<void> {
    try {
      await GoogleSignin.revokeAccess();
      await APIService.logout();
      console.log('✅ Google access revoked');
    } catch (error) {
      console.error('❌ Revoke access failed:', error);
    }
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use signInWithGoogle() instead
   */
  static handleOAuthCallback(url: string): GoogleAuthResult {
    console.warn('handleOAuthCallback is deprecated. Use native Google Sign-In instead.');
    return {
      success: false,
      error: 'Legacy OAuth callback method not supported',
    };
  }
}

export default GoogleAuthService; 