import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { User } from '../types';
import APIService, { sessionEvents, SESSION_EVENTS } from '../services/api';
import GoogleAuthService from '../services/googleAuth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signUp: (userData: SignUpData) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  completeOnboarding: (data: OnboardingData) => Promise<{ success: boolean; error?: string }>;
}

interface SignUpData {
  name: string;
  email: string;
  password: string;
  username: string;
}

interface OnboardingData {
  interests: string[];
  bio?: string;
  location?: string;
  dateOfBirth?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in on app startup
  useEffect(() => {
    checkAuthState();
    setupSessionEventListeners();
    
    // Cleanup listeners on unmount
    return () => {
      sessionEvents.removeAllListeners();
    };
  }, []);

  // Setup session event listeners
  const setupSessionEventListeners = () => {
    // Listen for session expiry events
    sessionEvents.on(SESSION_EVENTS.SESSION_EXPIRED, handleSessionExpired);
    
    // Listen for token refresh events
    sessionEvents.on(SESSION_EVENTS.TOKEN_REFRESHED, handleTokenRefreshed);
    
    // Listen for authentication failures
    sessionEvents.on(SESSION_EVENTS.AUTHENTICATION_FAILED, handleAuthenticationFailed);
  };

  // Handle session expiry
  const handleSessionExpired = async (error: any) => {
    console.log('🔒 Session expired, logging user out');
    
    // Clear local user state
    setUser(null);
    
    // Show user-friendly alert
    Alert.alert(
      'Session Expired',
      error.userFriendlyMessage || 'Your session has expired. Please log in again to continue.',
      [
        {
          text: 'OK',
          onPress: () => {
            // Additional cleanup if needed
            console.log('User acknowledged session expiry');
          },
        },
      ],
      { cancelable: false }
    );
  };

  // Handle successful token refresh
  const handleTokenRefreshed = () => {
    console.log('✅ Token refreshed successfully');
    // Could show a subtle notification or update UI state if needed
  };

  // Handle authentication failures
  const handleAuthenticationFailed = (error: any) => {
    console.log('❌ Authentication failed:', error);
    // Could show specific error message or take action
  };

  const checkAuthState = async () => {
    try {
      // Initialize API service
      await APIService.initialize();
      
      // Try to get current user from backend
      const userProfile = await APIService.getCurrentUser();
      
      if (userProfile) {
        // Convert backend user to frontend user format
        const user: User = {
          id: userProfile.id,
          email: userProfile.email,
          username: userProfile.username,
          name: userProfile.name || '',
          bio: userProfile.bio || '',
          image: userProfile.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.name || userProfile.username)}&background=667eea&color=fff&size=150`,
          location: userProfile.location || '',
          interests: userProfile.interests,
          onboardingCompleted: userProfile.onboardingCompleted,
          createdAt: new Date(userProfile.createdAt),
          updatedAt: new Date(),
        };
        setUser(user);
      } else {
        // Fallback to local storage (for backward compatibility)
        const userData = await AsyncStorage.getItem('@auth_user');
        if (userData) {
          setUser(JSON.parse(userData));
        }
      }
    } catch (error) {
      console.log('Error checking auth state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      // No mock data - use real authentication only
      return { success: false, error: 'Please use Google Sign In for authentication' };
    } catch (error) {
      return { success: false, error: 'An error occurred during sign in' };
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      console.log('Starting Google OAuth flow...');
      
      // Use Google OAuth service with deep linking
      const result = await GoogleAuthService.signInWithGoogle();
      console.log('Google OAuth result:', { success: result.success, hasTokens: !!(result.accessToken && result.refreshToken) });
      
      if (result.success && result.accessToken && result.refreshToken) {
        console.log('Storing tokens and setting up user...');
        
        // Store tokens
        await APIService.storeTokens({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        });
        
        // If user data is provided in the callback, use it directly
        if (result.user) {
          console.log('Using user data from OAuth callback:', result.user);
          const user: User = {
            id: result.user.id,
            email: result.user.email,
            username: result.user.username,
            name: result.user.name || '',
            bio: result.user.bio || '',
            image: result.user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(result.user.name || result.user.username)}&background=667eea&color=fff&size=150`,
            location: result.user.location || '',
            interests: result.user.interests || [],
            onboardingCompleted: result.user.onboardingCompleted || false,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          // Store user locally for offline access
          await AsyncStorage.setItem('@auth_user', JSON.stringify(user));
          setUser(user);
          
          console.log('User set successfully:', { 
            id: user.id, 
            email: user.email, 
            onboardingCompleted: user.onboardingCompleted 
          });
          
          return { success: true };
        } else {
          console.log('No user data in callback, fetching from backend...');
          // Fallback: Get user profile from backend
          const userProfile = await APIService.getCurrentUser();
          
          if (userProfile) {
            const user: User = {
              id: userProfile.id,
              email: userProfile.email,
              username: userProfile.username,
              name: userProfile.name || '',
              bio: userProfile.bio || '',
              image: userProfile.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.name || userProfile.username)}&background=667eea&color=fff&size=150`,
              location: userProfile.location || '',
              interests: userProfile.interests,
              onboardingCompleted: userProfile.onboardingCompleted,
              createdAt: new Date(userProfile.createdAt),
              updatedAt: new Date(),
            };
            
            // Store user locally for offline access
            await AsyncStorage.setItem('@auth_user', JSON.stringify(user));
            setUser(user);
            
            console.log('User fetched and set successfully:', { 
              id: user.id, 
              email: user.email, 
              onboardingCompleted: user.onboardingCompleted 
            });
            
            return { success: true };
          } else {
            console.error('Failed to get user profile from backend');
            return { success: false, error: 'Failed to get user profile' };
          }
        }
      } else {
        console.error('Google OAuth failed:', result.error);
        return { 
          success: false, 
          error: result.error || 'Google authentication failed' 
        };
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      return { success: false, error: 'An error occurred during Google sign in' };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (userData: SignUpData): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      // No mock data - use real authentication only
      return { success: false, error: 'Please use Google Sign In for authentication' };
    } catch (error) {
      return { success: false, error: 'An error occurred during sign up' };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Logout from Google first
      await GoogleAuthService.signOut();
      
      // Logout from backend
      await APIService.logout();
      
      // Clear local storage
      await AsyncStorage.multiRemove(['@auth_user', '@auth_access_token', '@auth_refresh_token']);
      setUser(null);
      
      console.log('Successfully signed out');
    } catch (error) {
      console.log('Error signing out:', error);
      // Even if there's an error, clear local state
      await AsyncStorage.multiRemove(['@auth_user', '@auth_access_token', '@auth_refresh_token']);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (userData: Partial<User>): Promise<void> => {
    try {
      if (user) {
        // Update user profile in the backend first
        const updateData = {
          name: userData.name,
          bio: userData.bio,
          location: userData.location,
          interests: userData.interests,
        };

        // Call backend API to update profile
        const response = await APIService.updateProfile(updateData);
        
        if (response) {
          // Update local user data with backend response
          const updatedUser: User = {
            ...user,
            ...userData,
            updatedAt: new Date(),
          };
          
          await AsyncStorage.setItem('@auth_user', JSON.stringify(updatedUser));
          setUser(updatedUser);
          console.log('Profile updated successfully');
        } else {
          console.error('Failed to update profile on backend');
          throw new Error('Failed to update profile');
        }
      }
    } catch (error) {
      console.error('Error updating user:', error);
      throw error; // Re-throw so the UI can handle the error
    }
  };

  const completeOnboarding = async (data: OnboardingData): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      const result = await APIService.completeOnboarding(data);
      
      if (result) {
        // Update local user data
        const updatedUser: User = {
          id: result.id,
          email: result.email,
          username: result.username,
          name: result.name || '',
          bio: result.bio || '',
          image: result.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(result.name || result.username)}&background=667eea&color=fff&size=150`,
          location: result.location || '',
          interests: result.interests,
          onboardingCompleted: result.onboardingCompleted,
          createdAt: new Date(result.createdAt),
          updatedAt: new Date(),
        };
        
        await AsyncStorage.setItem('@auth_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        
        return { success: true };
      } else {
        return { success: false, error: 'Failed to complete onboarding' };
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      return { success: false, error: 'An error occurred during onboarding' };
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    updateUser,
    completeOnboarding,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 