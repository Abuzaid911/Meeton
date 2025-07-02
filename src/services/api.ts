import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:3000/api';

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
 */
export class APIService {
  private static accessToken: string | null = null;
  private static refreshToken: string | null = null;

  /**
   * Initialize tokens from storage
   */
  static async initialize(): Promise<void> {
    try {
      this.accessToken = await AsyncStorage.getItem('@auth_access_token');
      this.refreshToken = await AsyncStorage.getItem('@auth_refresh_token');
    } catch (error) {
      console.error('Failed to initialize API service:', error);
    }
  }

  /**
   * Store authentication tokens
   */
  static async storeTokens(tokens: AuthTokens): Promise<void> {
    try {
      await AsyncStorage.setItem('@auth_access_token', tokens.accessToken);
      await AsyncStorage.setItem('@auth_refresh_token', tokens.refreshToken);
      this.accessToken = tokens.accessToken;
      this.refreshToken = tokens.refreshToken;
    } catch (error) {
      console.error('Failed to store tokens:', error);
      throw error;
    }
  }

  /**
   * Clear authentication tokens
   */
  static async clearTokens(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(['@auth_access_token', '@auth_refresh_token']);
      this.accessToken = null;
      this.refreshToken = null;
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
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
   * Refresh access token
   */
  static async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    try {
      const response = await this.makeRequest<AuthTokens>('/auth/refresh', {
        method: 'POST',
        body: { refreshToken: this.refreshToken },
        requireAuth: false,
      });

      if (response.success && response.data) {
        await this.storeTokens(response.data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      await this.clearTokens();
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
  static async rsvpToEvent(eventId: string, rsvp: 'YES' | 'NO' | 'MAYBE' | 'PENDING'): Promise<boolean> {
    try {
      const response = await this.makeRequest(`/events/${eventId}/rsvp`, {
        method: 'POST',
        body: { rsvp },
        requireAuth: true,
      });

      return response.success;
    } catch (error) {
      console.error('Failed to RSVP to event:', error);
      return false;
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

  // ============================================================================
  // Search API Methods
  // ============================================================================

  /**
   * Search users by name or username
   */
  static async searchUsers(query: string, limit: number = 20, offset: number = 0): Promise<UserProfile[] | null> {
    try {
      const queryParams = new URLSearchParams({
        q: query,
        limit: String(limit),
        offset: String(offset)
      });

      const response = await this.makeRequest<UserProfile[]>(`/users/search?${queryParams}`, {
        requireAuth: true,
      });

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to search users:', error);
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
   * Send friend request
   */
  static async sendFriendRequest(receiverId: string): Promise<boolean> {
    try {
      const response = await this.makeRequest('/friends/request', {
        method: 'POST',
        body: { receiverId },
        requireAuth: true,
      });

      return response.success;
    } catch (error) {
      console.error('Failed to send friend request:', error);
      return false;
    }
  }

  /**
   * Respond to friend request
   */
  static async respondToFriendRequest(requestId: string, action: 'ACCEPTED' | 'DECLINED'): Promise<boolean> {
    try {
      const response = await this.makeRequest(`/friends/request/${requestId}`, {
        method: 'PUT',
        body: { action },
        requireAuth: true,
      });

      return response.success;
    } catch (error) {
      console.error('Failed to respond to friend request:', error);
      return false;
    }
  }

  /**
   * Get user profile by ID
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const response = await this.makeRequest<UserProfile>(`/users/${userId}`, {
        requireAuth: true,
      });

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
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
      return null;
    } catch (error) {
      console.error('Failed to get friendship status:', error);
      return null;
    }
  }

  /**
   * Make HTTP request to backend API
   */
  private static async makeRequest<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: any;
      requireAuth?: boolean;
      retryOnTokenRefresh?: boolean;
    } = {}
  ): Promise<APIResponse<T>> {
    const {
      method = 'GET',
      body,
      requireAuth = false,
      retryOnTokenRefresh = true,
    } = options;

    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authorization header if required
    if (requireAuth && this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const config: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, config);
      
      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401 && requireAuth && retryOnTokenRefresh) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry request with new token
          return this.makeRequest<T>(endpoint, { ...options, retryOnTokenRefresh: false });
        }
      }

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || {
            code: 'REQUEST_FAILED',
            message: `Request failed with status ${response.status}`,
            statusCode: response.status,
          },
        };
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network request failed',
          statusCode: 0,
        },
      };
    }
  }
}

// Initialize API service
APIService.initialize();

export default APIService; 