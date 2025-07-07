import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config/api';

/**
 * ============================================================================
 * MeetOn Token Management System
 * ============================================================================
 * 
 * Token Configuration:
 * • Access Token (JWT): 30 minutes, stored in memory only for security
 * • Refresh Token: 14 days, stored in SecureStore for persistence
 * 
 * App Launch Flow:
 * 1. Check if refresh token exists in SecureStore
 * 2. If yes, attempt to get fresh access token using refresh token
 * 3. If refresh fails, clear all tokens (user needs to re-authenticate)
 * 4. If no refresh token, user needs to authenticate
 * 
 * Security Benefits:
 * • Access tokens never persisted to disk (memory only)
 * • Refresh tokens encrypted in SecureStore (iOS Keychain/Android Keystore)
 * • Automatic token refresh with 30min access token expiry
 * • Session expiry handling with user-friendly messages
 * 
 * Usage:
 * • APIService.initialize() - Call on app launch
 * • APIService.isAuthenticated() - Check if user has valid tokens
 * • APIService.getCurrentUser() - Get current user (auto-refreshes if needed)
 * ============================================================================
 */

// ============================================================================
// Session Management Event System (React Native Compatible)
// ============================================================================

type SessionEventListener = (data?: any) => void;

class SessionEventManager {
  private listeners: { [event: string]: SessionEventListener[] } = {};

  on(event: string, listener: SessionEventListener) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  off(event: string, listener: SessionEventListener) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(l => l !== listener);
  }

  emit(event: string, data?: any) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in session event listener for ${event}:`, error);
      }
    });
  }

  removeAllListeners() {
    this.listeners = {};
  }
}

export const sessionEvents = new SessionEventManager();

// Event types for session management
export const SESSION_EVENTS = {
  SESSION_EXPIRED: 'session_expired',
  TOKEN_REFRESHED: 'token_refreshed',
  AUTHENTICATION_FAILED: 'authentication_failed',
} as const;

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface APIResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    statusCode: number;
  };
}

// Enhanced error type for session expiry
interface SessionExpiredError extends Error {
  isSessionExpired: true;
  code: 'SESSION_EXPIRED';
  userFriendlyMessage: string;
  shouldRedirectToLogin: boolean;
}

// Enhanced API response type with session info
interface EnhancedAPIResponse<T> extends APIResponse<T> {
  sessionExpired?: boolean;
  requiresLogin?: boolean;
}

// Token storage keys
const SECURE_STORE_KEYS = {
  REFRESH_TOKEN: 'auth_refresh_token',
  USER_DATA: 'auth_user_data', // Also store user data securely
} as const;

const ASYNC_STORAGE_KEYS = {
  USER_DATA_CACHE: '@auth_user_cache', // Cache for offline access
} as const;

interface UserProfile {
  id: string;
  email: string;
  username: string;
  name?: string;
  image?: string;
  bio?: string;
  location?: string;
  interests: string[];
  onboardingCompleted: boolean;
  emailVerified?: string | null;
  createdAt: string;
}

interface CreateEventData {
  name: string;
  date: string;
  time: string;
  location: string;
  lat?: number;
  lng?: number;
  description?: string;
  duration: number;
  capacity?: number;
  headerType?: 'color' | 'image';
  headerColor?: string;
  headerImageUrl?: string;
  category?: string;
  tags?: string[];
  privacyLevel: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE';
  ticketPrice?: number;
  externalUrl?: string;
}

interface Event {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  lat?: number;
  lng?: number;
  description?: string;
  duration: number;
  capacity?: number;
  headerType?: string;
  headerColor?: string;
  headerImageUrl?: string;
  category?: string;
  tags: string[];
  privacyLevel: string;
  isArchived: boolean;
  viewCount: number;
  shareCount: number;
  hostId: string;
  host: {
    id: string;
    name?: string;
    username: string;
    image?: string;
  };
  attendees: Array<{
    id: string;
    rsvp: 'YES' | 'NO' | 'MAYBE' | 'PENDING';
    user: {
      id: string;
      name?: string;
      username: string;
      image?: string;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

/**
 * API Service for MeetOn Backend Communication
 * Handles authentication, token management, and API calls
 * 
 * Token Storage Strategy:
 * - Access Token (30min): Stored in memory for security
 * - Refresh Token (14 days): Stored in SecureStore for persistence
 * - User Data: Cached in AsyncStorage for offline access, secured in SecureStore
 */
export class APIService {
  private static accessToken: string | null = null; // Memory storage for access token
  private static refreshToken: string | null = null; // Memory cache of refresh token
  private static isRefreshing: boolean = false;
  private static refreshPromise: Promise<boolean> | null = null;

  // ============================================================================
  // Enhanced Token Management Methods
  // ============================================================================

  /**
   * Initialize tokens from secure storage on app launch
   */
  static async initialize(): Promise<void> {
    try {
      console.log('🔐 Initializing API service with secure token storage...');
      
      // Access token is not persisted (30min expiry, memory only)
      this.accessToken = null;
      
      // Load refresh token from SecureStore
      this.refreshToken = await SecureStore.getItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
      
      if (this.refreshToken) {
        console.log('🔑 Refresh token found, attempting to get fresh access token...');
        console.log('🔑 Refresh token length:', this.refreshToken.length);
        console.log('🔑 Refresh token preview:', this.refreshToken.substring(0, 20) + '...');
        
        // Try to get a fresh access token using the refresh token
        const refreshSuccess = await this.refreshAccessToken();
        
        if (!refreshSuccess) {
          console.log('❌ Failed to refresh access token, clearing stored tokens');
          await this.clearTokens();
        } else {
          console.log('✅ Access token refreshed successfully on app launch');
        }
      } else {
        console.log('🔍 No refresh token found, user needs to authenticate');
      }
    } catch (error) {
      console.error('❌ Failed to initialize API service:', error);
      await this.clearTokens();
    }
  }

  /**
   * Store authentication tokens with proper security
   * Access token: Memory only (30min)
   * Refresh token: SecureStore (14 days)
   */
  static async storeTokens(tokens: AuthTokens): Promise<void> {
    try {
      console.log('🔐 Storing tokens securely...');
      console.log('🔐 Access token length:', tokens.accessToken.length);
      console.log('🔐 Refresh token length:', tokens.refreshToken.length);
      
      // Store access token in memory only
      this.accessToken = tokens.accessToken;
      
      // Store refresh token in SecureStore
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
      this.refreshToken = tokens.refreshToken;
      
      console.log('✅ Tokens stored successfully');
      
      // Verify storage by reading back
      const storedRefreshToken = await SecureStore.getItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
      if (storedRefreshToken === tokens.refreshToken) {
        console.log('✅ Refresh token storage verified');
      } else {
        console.log('❌ Refresh token storage verification failed');
      }
    } catch (error) {
      console.error('❌ Failed to store tokens:', error);
      throw error;
    }
  }

  /**
   * Clear all authentication tokens
   */
  static async clearTokens(): Promise<void> {
    try {
      console.log('🧹 Clearing all tokens...');
      
      // Clear memory storage
      this.accessToken = null;
      this.refreshToken = null;
      
      // Clear SecureStore
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
      
      // Clear user data cache
      await AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.USER_DATA_CACHE);
      
      console.log('✅ All tokens cleared');
    } catch (error) {
      console.error('❌ Failed to clear tokens:', error);
    }
  }

  /**
   * Check if user is authenticated (has valid access token or refresh token)
   */
  static isAuthenticated(): boolean {
    return !!(this.accessToken || this.refreshToken);
  }

  /**
   * Get access token, refresh if needed
   */
  static async getValidAccessToken(): Promise<string | null> {
    // If we have a valid access token in memory, return it
    if (this.accessToken) {
      console.log('🔑 Using cached access token');
      return this.accessToken;
    }
    
    // If we have a refresh token, try to get a new access token
    if (this.refreshToken) {
      console.log('🔄 Access token not found, attempting refresh...');
      const refreshSuccess = await this.refreshAccessToken();
      
      if (refreshSuccess && this.accessToken) {
        console.log('✅ Successfully refreshed access token');
        return this.accessToken;
      } else {
        console.log('❌ Failed to refresh access token');
      }
    } else {
      console.log('❌ No refresh token available');
    }
    
    console.log('❌ No valid tokens available');
    return null;
  }

  /**
   * Get current user profile
   */
  static async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const response = await this.makeRequest<UserProfile>('/auth/me', {
        requireAuth: true,
      });

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Handle session expiry - clear tokens and emit event
   */
  private static async handleSessionExpiry(errorMessage?: string): Promise<void> {
    console.log('🔒 Session expired, clearing tokens and notifying app');
    
    await this.clearTokens();
    
    const sessionError: SessionExpiredError = {
      name: 'SessionExpiredError',
      message: errorMessage || 'Your session has expired',
      isSessionExpired: true,
      code: 'SESSION_EXPIRED',
      userFriendlyMessage: 'Your session has expired. Please log in again to continue.',
      shouldRedirectToLogin: true,
    };
    
    // Emit session expired event
    sessionEvents.emit(SESSION_EVENTS.SESSION_EXPIRED, sessionError);
  }

  /**
   * Check if error is related to session expiry
   */
  private static isSessionExpiredError(error: any): boolean {
    if (!error) return false;
    
    const statusCode = error.statusCode || error.status;
    const errorCode = error.code;
    const errorMessage = error.message?.toLowerCase() || '';
    
    // Check for various session expiry indicators
    return (
      statusCode === 401 ||
      errorCode === 'AUTHENTICATION_ERROR' ||
      errorCode === 'INVALID_TOKEN' ||
      errorCode === 'TOKEN_EXPIRED' ||
      errorMessage.includes('invalid token') ||
      errorMessage.includes('token expired') ||
      errorMessage.includes('session expired') ||
      errorMessage.includes('authorization header required')
    );
  }

  /**
   * Create user-friendly error message based on error type
   */
  private static getUserFriendlyErrorMessage(error: any, action?: string): string {
    if (this.isSessionExpiredError(error)) {
      return 'Your session has expired. Please log in again to continue.';
    }
    
    const defaultMessages: Record<string, string> = {
      'send friend request': 'Failed to send friend request. Please try again.',
      'respond to friend request': 'Failed to respond to friend request. Please try again.',
      'get friends': 'Failed to load friends. Please try again.',
      'get friend requests': 'Failed to load friend requests. Please try again.',
      'get friendship status': 'Failed to check friendship status. Please try again.',
      'remove friend': 'Failed to remove friend. Please try again.',
    };
    
    return defaultMessages[action || ''] || 'An error occurred. Please try again.';
  }

  // ============================================================================
  // Token Management Methods
  // ============================================================================

  /**
   * Refresh access token with concurrent request protection
   */
  static async refreshAccessToken(): Promise<boolean> {
    // If already refreshing, wait for the existing refresh attempt
    if (this.isRefreshing && this.refreshPromise) {
      return await this.refreshPromise;
    }

    if (!this.refreshToken) {
      console.log('❌ No refresh token available');
      await this.handleSessionExpiry('No refresh token available');
      return false;
    }

    // Mark as refreshing and create promise
    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh
   */
  private static async performTokenRefresh(): Promise<boolean> {
    try {
      console.log('🔄 Attempting to refresh access token...');
      console.log('🔄 Current refresh token available:', !!this.refreshToken);
      console.log('🔄 Refresh token length:', this.refreshToken?.length || 0);
      
      if (!this.refreshToken) {
        console.log('❌ No refresh token available for refresh');
        await this.handleSessionExpiry('No refresh token available');
        return false;
      }
      
      console.log('🔄 Making refresh request to backend...');
      const response = await this.makeRequest<AuthTokens>('/auth/refresh', {
        method: 'POST',
        body: { refreshToken: this.refreshToken },
        requireAuth: false,
      });

      console.log('🔄 Refresh response received:', {
        success: response.success,
        hasData: !!response.data,
        errorCode: response.error?.code,
        errorMessage: response.error?.message,
      });

      if (response.success && response.data) {
        await this.storeTokens(response.data);
        console.log('✅ Token refreshed successfully');
        
        // Emit token refreshed event
        sessionEvents.emit(SESSION_EVENTS.TOKEN_REFRESHED);
        return true;
      } else {
        console.log('❌ Token refresh failed:', response.error?.message);
        await this.handleSessionExpiry(response.error?.message || 'Token refresh failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      await this.handleSessionExpiry('Token refresh failed');
      return false;
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    try {
      if (this.refreshToken) {
        await this.makeRequest('/auth/logout', {
          method: 'POST',
          body: { refreshToken: this.refreshToken },
          requireAuth: false,
        });
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      await this.clearTokens();
    }
  }

  /**
   * Complete user onboarding
   */
  static async completeOnboarding(data: {
    interests: string[];
    bio?: string;
    location?: string;
    dateOfBirth?: string;
  }): Promise<UserProfile | null> {
    try {
      const response = await this.makeRequest<UserProfile>('/auth/onboarding', {
        method: 'POST',
        body: data,
        requireAuth: true,
      });

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      return null;
    }
  }

  /**
   * Check username availability
   */
  static async checkUsernameAvailability(username: string): Promise<boolean> {
    try {
      const response = await this.makeRequest<{ available: boolean }>(`/users/check-username/${username}`, {
        requireAuth: false,
      });

      return response.success && response.data?.available === true;
    } catch (error) {
      console.error('Failed to check username:', error);
      return false;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(data: {
    name?: string;
    bio?: string;
    location?: string;
  }): Promise<UserProfile | null> {
    try {
      const response = await this.makeRequest<UserProfile>('/users/profile', {
        method: 'PUT',
        body: data,
        requireAuth: true,
      });

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to update profile:', error);
      return null;
    }
  }

  /**
   * Complete welcome profile setup
   */
  static async completeWelcomeProfile(data: {
    name: string;
    username: string;
  }): Promise<UserProfile | null> {
    try {
      const response = await this.makeRequest<UserProfile>('/users/complete-welcome', {
        method: 'POST',
        body: data,
        requireAuth: true,
      });

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to complete welcome profile:', error);
      return null;
    }
  }

  // ============================================================================
  // Event API Methods
  // ============================================================================

  /**
   * Create a new event
   */
  static async createEvent(eventData: CreateEventData): Promise<Event | null> {
    try {
      const response = await this.makeRequest<Event>('/events', {
        method: 'POST',
        body: eventData,
        requireAuth: true,
      });

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to create event:', error);
      return null;
    }
  }

  /**
   * Get events with filtering and pagination
   */
  static async getEvents(options: {
    page?: number;
    limit?: number;
    category?: string;
    privacy?: string;
    search?: string;
    hostId?: string;
    attendeeId?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<Event[] | null> {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      const queryString = queryParams.toString();
      const endpoint = queryString ? `/events?${queryString}` : '/events';

      const response = await this.makeRequest<Event[]>(endpoint, {
        requireAuth: false, // Events can be viewed without auth (depending on privacy)
      });

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to get events:', error);
      return null;
    }
  }

  /**
   * Get event by ID
   */
  static async getEventById(eventId: string): Promise<Event | null> {
    try {
      const response = await this.makeRequest<Event>(`/events/${eventId}`, {
        requireAuth: false, // Can view public events without auth
      });

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to get event:', error);
      return null;
    }
  }

  /**
   * Update an event
   */
  static async updateEvent(eventId: string, updateData: Partial<CreateEventData>): Promise<Event | null> {
    try {
      const response = await this.makeRequest<Event>(`/events/${eventId}`, {
        method: 'PUT',
        body: updateData,
        requireAuth: true,
      });

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to update event:', error);
      return null;
    }
  }

  /**
   * Delete an event
   */
  static async deleteEvent(eventId: string): Promise<boolean> {
    try {
      const response = await this.makeRequest(`/events/${eventId}`, {
        method: 'DELETE',
        requireAuth: true,
      });

      return response.success;
    } catch (error) {
      console.error('Failed to delete event:', error);
      return false;
    }
  }

  /**
   * RSVP to an event
   */
  static async rsvpToEvent(eventId: string, rsvp: 'YES' | 'NO' | 'MAYBE' | 'PENDING'): Promise<{ success: boolean; event?: Event }> {
    try {
      const response = await this.makeRequest<{ attendee: any; event: Event }>(`/events/${eventId}/rsvp`, {
        method: 'POST',
        body: { rsvp },
        requireAuth: true,
      });

      if (response.success && response.data) {
        return { 
          success: true, 
          event: response.data.event as Event
        };
      }
      return { success: false };
    } catch (error) {
      console.error('Failed to RSVP to event:', error);
      return { success: false };
    }
  }

  /**
   * Remove attendee from event
   */
  static async removeAttendee(eventId: string, userId: string): Promise<boolean> {
    try {
      const response = await this.makeRequest(`/events/${eventId}/attendees/${userId}`, {
        method: 'DELETE',
        requireAuth: true,
      });

      return response.success;
    } catch (error) {
      console.error('Failed to remove attendee:', error);
      return false;
    }
  }

  /**
   * Get user's events (hosted and attending)
   */
  static async getUserEvents(userId: string): Promise<{ hosting: Event[]; attending: Event[] } | null> {
    try {
      const response = await this.makeRequest<{ hosting: Event[]; attending: Event[] }>(`/events/user/${userId}`, {
        requireAuth: true,
      });

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to get user events:', error);
      return null;
    }
  }

  /**
   * Get all photos for an event
   */
  static async getEventPhotos(eventId: string) {
    try {
      const response = await this.makeRequest(`/events/${eventId}/photos`, {
        requireAuth: false,
      });
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to get event photos:', error);
      return null;
    }
  }

  /**
   * Get attendees for an event
   */
  static async getEventAttendees(eventId: string) {
    try {
      const response = await this.makeRequest(`/events/${eventId}/attendees`, {
        requireAuth: false,
      });
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to get event attendees:', error);
      return null;
    }
  }

  /**
   * Upload a photo to an event (Cloudinary)
   */
  static async uploadEventPhoto(eventId: string, imageUri: string, caption?: string) {
    try {
      const formData = new FormData();
      formData.append('photo', {
        uri: imageUri,
        name: 'photo.jpg',
        type: 'image/jpeg',
      } as any);
      if (caption) formData.append('caption', caption);
      
      const response = await this.makeRequest<any>(`/events/${eventId}/photos`, {
        method: 'POST',
        body: formData,
        requireAuth: true,
        action: 'upload event photo',
      });
      
      return response.success ? response.data : null;
    } catch (error) {
      console.error('Failed to upload event photo:', error);
      return null;
    }
  }

  // ============================================================================
  // Search API Methods
  // ============================================================================

  /**
   * Search users by name or username
   * Temporary workaround: Extract users from events data
   */
  static async searchUsers(query: string, limit: number = 20, offset: number = 0): Promise<UserProfile[] | null> {
    try {
      // Get events data which includes user information
      const response = await this.makeRequest<Event[]>('/events', {
        requireAuth: false,
      });

      if (response.success && response.data) {
        // Extract unique users from events (hosts and attendees)
        const usersMap = new Map<string, UserProfile>();
        
        response.data.forEach(event => {
          // Add host to users map
          if (event.host && (
            event.host.name?.toLowerCase().includes(query.toLowerCase()) ||
            event.host.username?.toLowerCase().includes(query.toLowerCase())
          )) {
            usersMap.set(event.host.id, {
              id: event.host.id,
              name: event.host.name || '',
              username: event.host.username || '',
              email: '', // Not available in events data
              image: event.host.image || undefined,
              bio: undefined, // Not available in events data
              location: undefined, // Not available in events data
              interests: [],
              onboardingCompleted: true,
              emailVerified: undefined,
              createdAt: new Date().toISOString(),
            });
          }

          // Add attendees to users map
          event.attendees?.forEach(attendee => {
            if (attendee.user && (
              attendee.user.name?.toLowerCase().includes(query.toLowerCase()) ||
              attendee.user.username?.toLowerCase().includes(query.toLowerCase())
            )) {
              usersMap.set(attendee.user.id, {
                id: attendee.user.id,
                name: attendee.user.name || '',
                username: attendee.user.username || '',
                email: '', // Not available in events data
                image: attendee.user.image || undefined,
                bio: undefined, // Not available in events data
                location: undefined, // Not available in events data
                interests: [],
                onboardingCompleted: true,
                emailVerified: undefined,
                createdAt: new Date().toISOString(),
              });
            }
          });
        });

        // Convert map to array and apply limit
        const users = Array.from(usersMap.values()).slice(offset, offset + limit);
        return users;
      }
      return null;
    } catch (error) {
      console.error('Search users error:', error);
      return null;
    }
  }

  /**
   * Search events by name, location, or description
   */
  static async searchEvents(query: string, filters: {
    category?: string;
    privacy?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<Event[] | null> {
    try {
      const queryParams = new URLSearchParams({
        search: query,
        ...filters,
        page: String(filters.page || 1),
        limit: String(filters.limit || 20)
      });

      // Remove undefined/empty values
      Array.from(queryParams.entries()).forEach(([key, value]) => {
        if (!value || value === 'undefined') {
          queryParams.delete(key);
        }
      });

      const response = await this.makeRequest<Event[]>(`/events?${queryParams}`, {
        requireAuth: false,
      });

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to search events:', error);
      return null;
    }
  }

  // ============================================================================
  // Friend API Methods
  // ============================================================================

  /**
   * Send friend request with enhanced error handling
   */
  static async sendFriendRequest(receiverId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.makeRequest<any>('/friends/request', {
        method: 'POST',
        body: { receiverId },
        requireAuth: true,
        action: 'send friend request',
      });

      if (response.success) {
        return { success: true };
      } else {
        const errorMessage = this.getUserFriendlyErrorMessage(response.error, 'send friend request');
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error('Failed to send friend request:', error);
      return { success: false, error: 'Failed to send friend request. Please try again.' };
    }
  }

  /**
   * Respond to friend request with enhanced error handling
   */
  static async respondToFriendRequest(requestId: string, action: 'ACCEPTED' | 'DECLINED'): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.makeRequest<any>('/friends/respond', {
        method: 'POST',
        body: { requestId, action },
        requireAuth: true,
        action: 'respond to friend request',
      });

      if (response.success) {
        return { success: true };
      } else {
        const errorMessage = this.getUserFriendlyErrorMessage(response.error, 'respond to friend request');
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error('Failed to respond to friend request:', error);
      return { success: false, error: 'Failed to respond to friend request. Please try again.' };
    }
  }

  /**
   * Get user profile by ID
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const response = await this.makeRequest<UserProfile>(`/users/${userId}`, {
        requireAuth: true,
        action: 'get user profile'
      });

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      
      if (this.isSessionExpiredError(error)) {
        const sessionError = new Error(this.getUserFriendlyErrorMessage(error, 'get user profile'));
        (sessionError as any).isSessionExpired = true;
        (sessionError as any).code = 'SESSION_EXPIRED';
        throw sessionError;
      }
      
      return null;
    }
  }

  /**
   * Get user's friends list
   */
  static async getFriends(): Promise<UserProfile[]> {
    try {
      const response = await this.makeRequest<UserProfile[]>('/friends', {
        requireAuth: true,
      });

      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Failed to get friends:', error);
      return [];
    }
  }

  /**
   * Get friends for a specific user
   */
  static async getUserFriends(userId: string): Promise<UserProfile[]> {
    try {
      const response = await this.makeRequest<UserProfile[]>(`/friends/${userId}`, {
        requireAuth: true,
      });

      if (response.success && response.data) {
        console.log('User friends loaded:', response.data.length, 'friends for user', userId);
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Failed to get user friends:', error);
      // For now, return an empty array if the endpoint doesn't exist yet
      return [];
    }
  }

  /**
   * Get pending friend requests (sent and received)
   */
  static async getFriendRequests(): Promise<{
    sent: Array<{
      id: string;
      receiver: UserProfile;
      createdAt: string;
    }>;
    received: Array<{
      id: string;
      sender: UserProfile;
      createdAt: string;
    }>;
  }> {
    try {
      const response = await this.makeRequest<{
        sent: Array<{ id: string; user: UserProfile; createdAt: string }>;
        received: Array<{ id: string; user: UserProfile; createdAt: string }>;
      }>('/friends/requests', {
        requireAuth: true,
      });

      if (response.success && response.data) {
        return {
          sent: response.data.sent.map(req => ({
            id: req.id,
            receiver: req.user,
            createdAt: req.createdAt,
          })),
          received: response.data.received.map(req => ({
            id: req.id,
            sender: req.user,
            createdAt: req.createdAt,
          })),
        };
      }
      return { sent: [], received: [] };
    } catch (error) {
      console.error('Failed to get friend requests:', error);
      return { sent: [], received: [] };
    }
  }

  /**
   * Get suggested friends - users who might be interesting to connect with
   */
  static async getSuggestedFriends(): Promise<UserProfile[]> {
    try {
      // Get a list of all users through search (empty query returns recent users)
      const allUsers = await this.searchUsers('', 50);
      if (!allUsers) return [];

      // Get current friends and pending requests to filter them out
      const [friends, requests] = await Promise.all([
        this.getFriends(),
        this.getFriendRequests()
      ]);

      const currentUser = await this.getCurrentUser();
      if (!currentUser) return [];

      // Create sets of user IDs to exclude
      const excludeIds = new Set<string>();
      excludeIds.add(currentUser.id); // Don't suggest yourself
      
      friends.forEach(friend => excludeIds.add(friend.id));
      requests.sent.forEach(req => excludeIds.add(req.receiver.id));
      requests.received.forEach(req => excludeIds.add(req.sender.id));

      // Filter out excluded users and return suggestions
      const suggested = allUsers.filter(user => !excludeIds.has(user.id));
      
      console.log('Suggested friends loaded:', suggested.length, 'suggestions');
      return suggested.slice(0, 20); // Limit to 20 suggestions
    } catch (error) {
      console.error('Failed to get suggested friends:', error);
      return [];
    }
  }



  /**
   * Get friendship status between current user and another user
   */
  static async getFriendshipStatus(userId: string): Promise<{
    status: 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'FRIENDS';
    requestId?: string;
  } | null> {
    try {
      const response = await this.makeRequest<{
        status: 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'FRIENDS';
        requestId?: string;
      }>(`/friends/status/${userId}`, {
        requireAuth: true,
      });

      if (response.success && response.data) {
        return response.data;
      }
      return { status: 'NONE' };
    } catch (error) {
      console.error('Failed to get friendship status:', error);
      return { status: 'NONE' };
    }
  }

  /**
   * Remove a friend
   */
  static async removeFriend(userId: string): Promise<boolean> {
    try {
      const response = await this.makeRequest<any>(`/friends/${userId}`, {
        method: 'DELETE',
        requireAuth: true,
      });

      return response.success;
    } catch (error) {
      console.error('Failed to remove friend:', error);
      return false;
    }
  }

  /**
   * Cancel a sent friend request
   */
  static async cancelFriendRequest(userId: string): Promise<boolean> {
    try {
      const response = await this.makeRequest<any>(`/friends/request/${userId}`, {
        method: 'DELETE',
        requireAuth: true,
        action: 'cancel friend request',
      });

      return response.success;
    } catch (error) {
      console.error('Failed to cancel friend request:', error);
      return false;
    }
  }

  // ============================================================================
  // Notification API Methods
  // ============================================================================

  /**
   * Get user notifications with pagination
   */
  static async getNotifications(options: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  } = {}): Promise<{
    notifications: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  } | null> {
    try {
      const queryParams = new URLSearchParams({
        page: String(options.page || 1),
        limit: String(options.limit || 20),
        unreadOnly: String(options.unreadOnly || false),
      });

      const response = await this.makeRequest<any>(`/notifications?${queryParams}`, {
        requireAuth: true,
      });

      if (response.success && response.data && (response as any).pagination) {
        return {
          notifications: response.data,
          pagination: (response as any).pagination,
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get notifications:', error);
      return null;
    }
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      const response = await this.makeRequest<any>(`/notifications/${notificationId}/read`, {
        method: 'PATCH',
        requireAuth: true,
      });

      return response.success;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllNotificationsAsRead(): Promise<boolean> {
    try {
      const response = await this.makeRequest<any>('/notifications/read-all', {
        method: 'PATCH',
        requireAuth: true,
      });

      return response.success;
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      return false;
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const response = await this.makeRequest<any>(`/notifications/${notificationId}`, {
        method: 'DELETE',
        requireAuth: true,
      });

      return response.success;
    } catch (error) {
      console.error('Failed to delete notification:', error);
      return false;
    }
  }

  /**
   * Update notification settings
   */
  static async updateNotificationSettings(settings: {
    pushNotifications?: boolean;
    emailNotifications?: boolean;
    smsNotifications?: boolean;
  }): Promise<boolean> {
    try {
      const response = await this.makeRequest<any>('/notifications/settings', {
        method: 'PATCH',
        body: settings,
        requireAuth: true,
      });

      return response.success;
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      return false;
    }
  }

  /**
   * Register FCM device token for push notifications
   */
  static async registerDeviceToken(token: string, platform: 'ios' | 'android'): Promise<boolean> {
    try {
      const response = await this.makeRequest(
        '/api/notifications/register-token',
        {
          method: 'POST',
          body: { token, platform },
          requireAuth: true,
        }
      );

      return response.success;
    } catch (error) {
      console.error('Register device token error:', error);
      throw error;
    }
  }

  /**
   * Unregister FCM device token
   */
  static async unregisterDeviceToken(token: string): Promise<boolean> {
    try {
      const response = await this.makeRequest(
        '/api/notifications/unregister-token',
        {
          method: 'POST',
          body: { token },
          requireAuth: true,
        }
      );

      return response.success;
    } catch (error) {
      console.error('Unregister device token error:', error);
      throw error;
    }
  }

  // ============================================================================
  // Sharing Methods
  // ============================================================================

  /**
   * Generate an invite link for an event
   */
  static async generateInviteLink(eventId: string, options: {
    expiresIn?: number;
    maxUses?: number;
    customMessage?: string;
  } = {}): Promise<any> {
    const response = await this.makeRequest(`/sharing/events/${eventId}/invite-links`, {
      method: 'POST',
      body: options,
      requireAuth: true,
      action: 'generate invite link',
    });

    return response.success ? response.data : null;
  }

  /**
   * Get invite link by token
   */
  static async getInviteLink(token: string): Promise<any> {
    const response = await this.makeRequest(`/sharing/invite/${token}`, {
      method: 'GET',
      requireAuth: false,
      action: 'get invite link',
    });

    return response.success ? response.data : null;
  }

  /**
   * Use an invite link
   */
  static async useInviteLink(token: string): Promise<boolean> {
    const response = await this.makeRequest(`/sharing/invite/${token}/use`, {
      method: 'POST',
      requireAuth: false,
      action: 'use invite link',
    });

    return response.success;
  }

  /**
   * Get all invite links for an event
   */
  static async getEventInviteLinks(eventId: string): Promise<any[]> {
    const response = await this.makeRequest(`/sharing/events/${eventId}/invite-links`, {
      method: 'GET',
      requireAuth: true,
      action: 'get invite links',
    });

    return response.success && Array.isArray(response.data) ? response.data : [];
  }

  /**
   * Deactivate an invite link
   */
  static async deactivateInviteLink(linkId: string): Promise<boolean> {
    const response = await this.makeRequest(`/sharing/invite-links/${linkId}`, {
      method: 'DELETE',
      requireAuth: true,
      action: 'deactivate invite link',
    });

    return response.success;
  }

  /**
   * Generate share URL for a platform
   */
  static async generateShareUrl(eventId: string, platform: string): Promise<string | null> {
    const response = await this.makeRequest(`/sharing/events/${eventId}/share/${platform}`, {
      method: 'GET',
      requireAuth: false,
      action: 'generate share URL',
    });

    return response.success && response.data && typeof response.data === 'object' 
      ? (response.data as any).shareUrl || null 
      : null;
  }

  /**
   * Get share content for an event
   */
  static async getShareContent(eventId: string, platform?: string): Promise<any> {
    const endpoint = platform 
      ? `/sharing/events/${eventId}/content?platform=${encodeURIComponent(platform)}`
      : `/sharing/events/${eventId}/content`;
      
    const response = await this.makeRequest(endpoint, {
      method: 'GET',
      requireAuth: false,
      action: 'get share content',
    });

    return response.success ? response.data : null;
  }

  /**
   * Get available social platforms
   */
  static async getSocialPlatforms(): Promise<any[]> {
    const response = await this.makeRequest('/sharing/platforms', {
      method: 'GET',
      requireAuth: false,
      action: 'get social platforms',
    });

    return response.success && Array.isArray(response.data) ? response.data : [];
  }

  /**
   * Generate QR code for event
   */
  static async generateQRCode(eventId: string): Promise<string | null> {
    const response = await this.makeRequest(`/sharing/events/${eventId}/qr-code`, {
      method: 'GET',
      requireAuth: false,
      action: 'generate QR code',
    });

    return response.success && response.data && typeof response.data === 'object'
      ? (response.data as any).qrCodeUrl || null
      : null;
  }

  /**
   * Get sharing analytics for an event
   */
  static async getSharingStats(eventId: string): Promise<any> {
    const response = await this.makeRequest(`/sharing/events/${eventId}/stats`, {
      method: 'GET',
      requireAuth: true,
      action: 'get sharing stats',
    });

    return response.success ? response.data : null;
  }

  /**
   * Get event summary for sharing
   */
  static async getEventSummary(eventId: string): Promise<any> {
    const response = await this.makeRequest(`/sharing/events/${eventId}/summary`, {
      method: 'GET',
      requireAuth: false,
      action: 'get event summary',
    });

    return response.success ? response.data : null;
  }

  // ============================================================================
  // Public API Methods for External Services
  // ============================================================================

  /**
   * Public makeRequest method for use by other services
   */
  static async makeRequest<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      body?: any;
      requireAuth?: boolean;
      action?: string;
    } = {}
  ): Promise<APIResponse<T>> {
    return this.makeRequestInternal<T>(endpoint, options);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Make HTTP request to backend API with enhanced session management
   */
  private static async makeRequestInternal<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      body?: any;
      requireAuth?: boolean;
      retryOnTokenRefresh?: boolean;
      retryCount?: number; // Track retry attempts
      action?: string; // For user-friendly error messages
    } = {}
  ): Promise<APIResponse<T>> {
    const {
      method = 'GET',
      body,
      requireAuth = false,
      retryOnTokenRefresh = true,
      retryCount = 0,
      action,
    } = options;

    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authorization header if required
    if (requireAuth) {
      const validToken = await this.getValidAccessToken();
      if (validToken) {
        headers.Authorization = `Bearer ${validToken}`;
        console.log(`🔐 Making authenticated request to ${endpoint}`);
      } else {
        // No valid token available, this will likely result in 401
        console.log(`⚠️ No valid access token available for authenticated request to ${endpoint}`);
      }
    } else {
      console.log(`🌐 Making unauthenticated request to ${endpoint}`);
    }

    const config: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    try {
      console.log(`📡 Sending ${method} request to ${url}`);
      const response = await fetch(url, config);
      console.log(`📡 Response status: ${response.status} for ${endpoint}`);
      
      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401 && requireAuth && retryOnTokenRefresh && retryCount < 2) {
        console.log(`🔒 Received 401, attempting token refresh... (retry ${retryCount + 1}/2)`);
        
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          console.log('✅ Token refreshed, retrying request...');
          // Retry request with new token and increment retry count
          return this.makeRequestInternal<T>(endpoint, { 
            ...options, 
            retryCount: retryCount + 1,
            // Allow one more retry attempt after refresh
            retryOnTokenRefresh: retryCount < 1 
          });
        } else {
          console.log('❌ Token refresh failed, session expired');
          // Session is expired, don't return generic error
          return {
            success: false,
            error: {
              code: 'SESSION_EXPIRED',
              message: 'Your session has expired. Please log in again.',
              statusCode: 401,
            },
            sessionExpired: true,
            requiresLogin: true,
          } as EnhancedAPIResponse<T>;
        }
      }

      const data = await response.json();
      
      if (!response.ok) {
        const error = data.error || {
          code: 'REQUEST_FAILED',
          message: `Request failed with status ${response.status}`,
          statusCode: response.status,
        };

        // Check if this is a session-related error
        if (this.isSessionExpiredError(error)) {
          console.log(`🔒 Detected session expired error (retry count: ${retryCount})`);
          
          // Only trigger session expiry if we've already tried refreshing
          if (retryCount > 0) {
            await this.handleSessionExpiry(error.message);
            
            return {
              success: false,
              error: {
                ...error,
                message: this.getUserFriendlyErrorMessage(error, action),
              },
              sessionExpired: true,
              requiresLogin: true,
            } as EnhancedAPIResponse<T>;
          } else {
            // First attempt - try to refresh token
            console.log('🔄 First 401 error, attempting token refresh...');
            const refreshed = await this.refreshAccessToken();
            if (refreshed) {
              console.log('✅ Token refreshed after session error, retrying request...');
              return this.makeRequestInternal<T>(endpoint, { 
                ...options, 
                retryCount: retryCount + 1,
                retryOnTokenRefresh: false // No more retries after this
              });
            } else {
              await this.handleSessionExpiry(error.message);
              return {
                success: false,
                error: {
                  ...error,
                  message: this.getUserFriendlyErrorMessage(error, action),
                },
                sessionExpired: true,
                requiresLogin: true,
              } as EnhancedAPIResponse<T>;
            }
          }
        }

        return {
          success: false,
          error,
        };
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      
      // Check if this is a network error that might indicate session issues
      const networkError = {
        code: 'NETWORK_ERROR',
        message: 'Network request failed',
        statusCode: 0,
      };

      return {
        success: false,
        error: networkError,
      };
    }
  }
}

// Initialize API service
APIService.initialize();

export default APIService; 