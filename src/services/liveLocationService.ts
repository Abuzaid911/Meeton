import { APIService } from './api';
import {
  LocationUpdateData,
  LocationShareSettings,
  GeofenceSettings,
  NearbyUser,
  LiveLocation,
  LocationHistory,
  GeofenceAlert,
  LocationAnalytics,
  LocationSharingLevel,
  GeofenceAlertType,
} from '../types';

/**
 * Live Location Service
 * Handles all live location API calls to the backend
 */
export class LiveLocationService {
  
  /**
   * Make a request to the live location API
   */
  private static async makeLocationRequest<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: any;
    } = {}
  ): Promise<{ success: boolean; data?: T; error?: any }> {
    try {
      const { method = 'GET', body } = options;
      const url = `${APIService.API_BASE_URL || 'https://meeton-backend.onrender.com/api'}/live-location${endpoint}`;
      
      const token = await APIService.getValidAccessToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const config: RequestInit = {
        method,
        headers,
      };

      if (body && method !== 'GET') {
        config.body = JSON.stringify(body);
      }

      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || { message: `Request failed with status ${response.status}` }
        };
      }

      return { success: true, data: data.data || data };
    } catch (error) {
      console.error('Live location API request failed:', error);
      return {
        success: false,
        error: { message: 'Network request failed' }
      };
    }
  }

  /**
   * Update user's current location
   */
  static async updateLocation(locationData: LocationUpdateData): Promise<boolean> {
    try {
      const response = await APIService.makeRequest<void>('/live-location/update', {
        method: 'POST',
        body: locationData,
        requireAuth: true,
        action: 'update location',
      });

      return response.success;
    } catch (error) {
      console.error('Failed to update location:', error);
      return false;
    }
  }

  /**
   * Update location sharing settings
   */
  static async updateSharingSettings(settings: LocationShareSettings): Promise<boolean> {
    try {
      const response = await APIService.makeRequest<LocationShareSettings>('/live-location/sharing', {
        method: 'PUT',
        body: {
          sharingLevel: settings.sharingLevel,
          eventId: settings.eventId,
          expiresIn: settings.sharingExpiresAt 
            ? Math.floor((settings.sharingExpiresAt.getTime() - Date.now()) / (1000 * 60)) 
            : undefined,
        },
        requireAuth: true,
        action: 'update sharing settings',
      });

      return response.success;
    } catch (error) {
      console.error('Failed to update sharing settings:', error);
      return false;
    }
  }

  /**
   * Get user's current location
   */
  static async getUserLocation(userId: string): Promise<LiveLocation | null> {
    try {
      const response = await APIService.makeRequest<LiveLocation>(`/live-location/user/${userId}`, {
        method: 'GET',
        requireAuth: true,
        action: 'get user location',
      });

      return response.success ? response.data || null : null;
    } catch (error) {
      console.error('Failed to get user location:', error);
      return null;
    }
  }

  /**
   * Get nearby users
   */
  static async getNearbyUsers(radius: number = 1000): Promise<NearbyUser[]> {
    try {
      const response = await APIService.makeRequest<NearbyUser[]>(`/live-location/nearby?radius=${radius}`, {
        method: 'GET',
        requireAuth: true,
        action: 'get nearby users',
      });

      return response.success ? response.data || [] : [];
    } catch (error) {
      console.error('Failed to get nearby users:', error);
      return [];
    }
  }

  /**
   * Get users at event location
   */
  static async getEventLocations(eventId: string): Promise<NearbyUser[]> {
    try {
      const response = await APIService.makeRequest<NearbyUser[]>(`/live-location/event/${eventId}`, {
        method: 'GET',
        requireAuth: true,
        action: 'get event locations',
      });

      return response.success ? response.data || [] : [];
    } catch (error) {
      console.error('Failed to get event locations:', error);
      return [];
    }
  }

  /**
   * Setup geofencing for an event
   */
  static async setupGeofencing(settings: GeofenceSettings): Promise<boolean> {
    try {
      const response = await APIService.makeRequest<GeofenceSettings>('/live-location/geofencing', {
        method: 'POST',
        body: settings,
        requireAuth: true,
        action: 'setup geofencing',
      });

      return response.success;
    } catch (error) {
      console.error('Failed to setup geofencing:', error);
      return false;
    }
  }

  /**
   * Stop location sharing
   */
  static async stopLocationSharing(): Promise<boolean> {
    try {
      const response = await APIService.makeRequest<void>('/live-location/sharing', {
        method: 'DELETE',
        requireAuth: true,
        action: 'stop location sharing',
      });

      return response.success;
    } catch (error) {
      console.error('Failed to stop location sharing:', error);
      return false;
    }
  }

  /**
   * Get location analytics (admin only)
   */
  static async getLocationAnalytics(): Promise<LocationAnalytics | null> {
    try {
      const response = await APIService.makeRequest<LocationAnalytics>('/live-location/analytics', {
        method: 'GET',
        requireAuth: true,
        action: 'get location analytics',
      });

      return response.success ? response.data || null : null;
    } catch (error) {
      console.error('Failed to get location analytics:', error);
      return null;
    }
  }

  /**
   * Get location history
   */
  static async getLocationHistory(options: {
    limit?: number;
    offset?: number;
    eventId?: string;
  } = {}): Promise<{
    history: LocationHistory[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  } | null> {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.eventId) params.append('eventId', options.eventId);

      const response = await APIService.makeRequest<{
        history: LocationHistory[];
        pagination: {
          total: number;
          limit: number;
          offset: number;
          hasMore: boolean;
        };
      }>(`/live-location/history?${params.toString()}`, {
        method: 'GET',
        requireAuth: true,
        action: 'get location history',
      });

      return response.success ? response.data || null : null;
    } catch (error) {
      console.error('Failed to get location history:', error);
      return null;
    }
  }

  /**
   * Get active geofences
   */
  static async getActiveGeofences(): Promise<GeofenceAlert[]> {
    try {
      const response = await APIService.makeRequest<GeofenceAlert[]>('/live-location/geofences', {
        method: 'GET',
        requireAuth: true,
        action: 'get active geofences',
      });

      return response.success ? response.data || [] : [];
    } catch (error) {
      console.error('Failed to get active geofences:', error);
      return [];
    }
  }

  /**
   * Disable a geofence
   */
  static async disableGeofence(geofenceId: string): Promise<boolean> {
    try {
      const response = await APIService.makeRequest<void>(`/live-location/geofences/${geofenceId}`, {
        method: 'DELETE',
        requireAuth: true,
        action: 'disable geofence',
      });

      return response.success;
    } catch (error) {
      console.error('Failed to disable geofence:', error);
      return false;
    }
  }

  /**
   * Helper method to format sharing level for display
   */
  static formatSharingLevel(level: LocationSharingLevel): string {
    switch (level) {
      case LocationSharingLevel.PRIVATE:
        return 'Private';
      case LocationSharingLevel.FRIENDS_ONLY:
        return 'Friends Only';
      case LocationSharingLevel.EVENT_ONLY:
        return 'Event Participants';
      case LocationSharingLevel.PUBLIC:
        return 'Public';
      default:
        return 'Private';
    }
  }

  /**
   * Helper method to format geofence alert type for display
   */
  static formatAlertType(type: GeofenceAlertType): string {
    switch (type) {
      case GeofenceAlertType.APPROACHING:
        return 'Approaching';
      case GeofenceAlertType.ARRIVED:
        return 'Arrived';
      case GeofenceAlertType.LEFT:
        return 'Left';
      default:
        return 'Unknown';
    }
  }

  /**
   * Helper method to format distance for display
   */
  static formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else if (meters < 10000) {
      return `${(meters / 1000).toFixed(1)}km`;
    } else {
      return `${Math.round(meters / 1000)}km`;
    }
  }

  /**
   * Helper method to calculate distance between two points
   */
  static calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Helper method to check if location sharing is active
   */
  static isLocationSharingActive(settings: LocationShareSettings): boolean {
    if (settings.sharingLevel === LocationSharingLevel.PRIVATE) {
      return false;
    }
    
    if (settings.sharingExpiresAt && settings.sharingExpiresAt < new Date()) {
      return false;
    }
    
    return true;
  }

  /**
   * Helper method to get remaining sharing time
   */
  static getRemainingShareTime(expiresAt?: Date): string | null {
    if (!expiresAt) return null;
    
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
} 