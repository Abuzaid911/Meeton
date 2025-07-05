import { PrismaClient, LocationSharingLevel, GeofenceAlertType } from '@prisma/client';
import DatabaseManager from '../config/database';
import { redisManager } from '../config/redis';
import { locationService } from './locationService';
import { Server as SocketIOServer } from 'socket.io';
import { ValidationError, NotFoundError } from '../utils/errors';

/**
 * Live Location Service
 * Handles real-time location tracking, sharing, and geofencing
 */

interface LocationUpdate {
  userId: string;
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  altitude?: number;
  batteryLevel?: number;
  eventId?: string;
}

interface LocationShareSettings {
  sharingLevel: LocationSharingLevel;
  sharingExpiresAt?: Date;
  eventId?: string;
}

interface GeofenceSettings {
  eventId: string;
  radius: number; // in meters
  alertTypes: GeofenceAlertType[];
}

interface NearbyUser {
  userId: string;
  name: string;
  image?: string;
  distance: number; // in meters
  lastSeen: Date;
  isAtEvent?: boolean;
  eventId?: string;
}

interface LocationAnalytics {
  totalUsers: number;
  activeUsers: number;
  usersAtEvents: number;
  averageAccuracy: number;
  locationUpdatesPerMinute: number;
}

export class LiveLocationService {
  private prisma: PrismaClient;
  private io?: SocketIOServer;
  
  // Redis keys
  private readonly LIVE_LOCATIONS_KEY = 'live_locations';
  private readonly USER_LOCATION_KEY = (userId: string) => `user_location:${userId}`;
  private readonly EVENT_LOCATIONS_KEY = (eventId: string) => `event_locations:${eventId}`;
  private readonly GEOFENCE_KEY = (userId: string, eventId: string) => `geofence:${userId}:${eventId}`;
  private readonly LOCATION_ANALYTICS_KEY = 'location_analytics';
  
  // Cache TTL (Time To Live)
  private readonly LOCATION_TTL = 300; // 5 minutes
  private readonly ANALYTICS_TTL = 60; // 1 minute

  constructor(io?: SocketIOServer) {
    this.prisma = DatabaseManager.getInstance();
    this.io = io;
  }

  /**
   * Update user's live location
   */
  async updateLocation(data: LocationUpdate): Promise<void> {
    try {
      const { userId, lat, lng, accuracy, heading, speed, altitude, batteryLevel, eventId } = data;

      // Validate coordinates
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new ValidationError('Invalid coordinates');
      }

      // Get current location settings
      const existingLocation = await this.prisma.liveLocation.findUnique({
        where: { userId },
        include: { user: { select: { name: true, image: true } } }
      });

      let sharingLevel: LocationSharingLevel = LocationSharingLevel.FRIENDS_ONLY;
      let sharingExpiresAt: Date | null = null;

      if (existingLocation) {
        sharingLevel = existingLocation.sharingLevel;
        sharingExpiresAt = existingLocation.sharingExpiresAt;
      }

      // Check if sharing has expired
      if (sharingExpiresAt && sharingExpiresAt < new Date()) {
        sharingLevel = LocationSharingLevel.PRIVATE;
        sharingExpiresAt = null;
      }

      // Reverse geocode to get address
      const locationDetails = await locationService.reverseGeocode(lat, lng);

      // Check if user is at an event location
      const isAtEvent = eventId ? await this.checkIfAtEvent(userId, eventId, lat, lng) : false;

      // Update database
      const updatedLocation = await this.prisma.liveLocation.upsert({
        where: { userId },
        update: {
          lat,
          lng,
          accuracy,
          heading,
          speed,
          altitude,
          batteryLevel,
          address: locationDetails?.formatted,
          city: locationDetails?.city,
          state: locationDetails?.state,
          country: locationDetails?.country,
          eventId,
          isAtEvent,
          updatedAt: new Date(),
        },
        create: {
          userId,
          lat,
          lng,
          accuracy,
          heading,
          speed,
          altitude,
          batteryLevel,
          address: locationDetails?.formatted,
          city: locationDetails?.city,
          state: locationDetails?.state,
          country: locationDetails?.country,
          sharingLevel,
          sharingExpiresAt,
          eventId,
          isAtEvent,
        },
        include: {
          user: { select: { name: true, image: true } }
        }
      });

      // Cache location in Redis
      await this.cacheLocation(updatedLocation);

      // Add to location history
      await this.addLocationHistory(userId, lat, lng, accuracy, locationDetails?.formatted, eventId);

      // Check geofences
      await this.checkGeofences(userId, lat, lng);

      // Broadcast location update via WebSocket
      if (this.io && sharingLevel !== LocationSharingLevel.PRIVATE) {
        await this.broadcastLocationUpdate(updatedLocation);
      }

      // Update analytics
      await this.updateLocationAnalytics();

      console.log(`Location updated for user ${userId}`);
    } catch (error) {
      console.error('Error updating location:', error);
      throw error;
    }
  }

  /**
   * Update location sharing settings
   */
  async updateSharingSettings(userId: string, settings: LocationShareSettings): Promise<void> {
    try {
      const { sharingLevel, sharingExpiresAt, eventId } = settings;

      await this.prisma.liveLocation.upsert({
        where: { userId },
        update: {
          sharingLevel,
          sharingExpiresAt,
          eventId,
        },
        create: {
          userId,
          lat: 0, // Will be updated when location is shared
          lng: 0,
          sharingLevel,
          sharingExpiresAt,
          eventId,
          isActive: false, // Will be activated when location is shared
        }
      });

      // Update cache
      const cacheKey = this.USER_LOCATION_KEY(userId);
      const cachedLocation = await redisManager.get(cacheKey);
      if (cachedLocation) {
        const locationData = cachedLocation as any;
        locationData.sharingLevel = sharingLevel;
        locationData.sharingExpiresAt = sharingExpiresAt;
        locationData.eventId = eventId;
        await redisManager.set(cacheKey, locationData, { ttl: this.LOCATION_TTL });
      }

      console.log(`Sharing settings updated for user ${userId}`);
    } catch (error) {
      console.error('Error updating sharing settings:', error);
      throw error;
    }
  }

  /**
   * Get user's current location
   */
  async getUserLocation(userId: string, requesterId?: string): Promise<any> {
    try {
      // Try cache first
      const cacheKey = this.USER_LOCATION_KEY(userId);
      const cachedLocation = await redisManager.get(cacheKey);
      
      if (cachedLocation) {
        const locationData = cachedLocation as any;
        
        // Check if requester has permission to view location
        if (await this.hasLocationPermission(userId, requesterId, locationData.sharingLevel)) {
          return locationData;
        }
      }

      // Fallback to database
      const location = await this.prisma.liveLocation.findUnique({
        where: { userId },
        include: {
          user: { select: { name: true, image: true } },
          event: { select: { name: true, location: true } }
        }
      });

      if (!location) {
        throw new NotFoundError('Location not found');
      }

      // Check permissions
      if (!await this.hasLocationPermission(userId, requesterId, location.sharingLevel)) {
        throw new ValidationError('No permission to view location');
      }

      // Cache the result
      await this.cacheLocation(location);

      return location;
    } catch (error) {
      console.error('Error getting user location:', error);
      throw error;
    }
  }

  /**
   * Get nearby users
   */
  async getNearbyUsers(userId: string, radius: number = 1000): Promise<NearbyUser[]> {
    try {
      const userLocation = await this.getUserLocation(userId);
      if (!userLocation) {
        return [];
      }

      const { lat, lng } = userLocation;

      // Get all active locations from cache (simplified approach)
      // In production, you'd want to use Redis geospatial commands
      const nearbyUsers: NearbyUser[] = [];

      // For now, get from database with bounding box
      const latDelta = radius / 111000; // Rough conversion: 1 degree ≈ 111km
      const lngDelta = radius / (111000 * Math.cos(lat * Math.PI / 180));

      const locations = await this.prisma.liveLocation.findMany({
        where: {
          userId: { not: userId },
          isActive: true,
          lat: { gte: lat - latDelta, lte: lat + latDelta },
          lng: { gte: lng - lngDelta, lte: lng + lngDelta },
          sharingLevel: { not: LocationSharingLevel.PRIVATE },
        },
        include: {
          user: { select: { name: true, image: true } }
        }
      });

      for (const location of locations) {
        const distance = this.calculateDistance(lat, lng, location.lat, location.lng);
        
        if (distance <= radius) {
          nearbyUsers.push({
            userId: location.userId,
            name: location.user.name || 'Unknown',
            image: location.user.image || undefined,
            distance: Math.round(distance),
            lastSeen: location.updatedAt,
            isAtEvent: location.isAtEvent,
            eventId: location.eventId || undefined,
          });
        }
      }

      // Sort by distance
      nearbyUsers.sort((a, b) => a.distance - b.distance);

      return nearbyUsers;
    } catch (error) {
      console.error('Error getting nearby users:', error);
      return [];
    }
  }

  /**
   * Get users at event location
   */
  async getUsersAtEvent(eventId: string, requesterId?: string): Promise<NearbyUser[]> {
    try {
      // Check if requester has permission to view event locations
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        include: {
          attendees: {
            where: { userId: requesterId },
            select: { userId: true }
          }
        }
      });

      if (!event) {
        throw new NotFoundError('Event not found');
      }

      // Only event attendees can see other attendees' locations
      const isAttendee = event.attendees.length > 0;
      if (!isAttendee) {
        throw new ValidationError('No permission to view event locations');
      }

      // Get cached event locations
      const cacheKey = this.EVENT_LOCATIONS_KEY(eventId);
      const cachedLocations = await redisManager.get(cacheKey);
      
      if (cachedLocations) {
        return cachedLocations as NearbyUser[];
      }

      // Fallback to database
      const locations = await this.prisma.liveLocation.findMany({
        where: {
          eventId,
          isAtEvent: true,
          OR: [
            { sharingLevel: LocationSharingLevel.PUBLIC },
            { sharingLevel: LocationSharingLevel.EVENT_ONLY },
            { sharingLevel: LocationSharingLevel.FRIENDS_ONLY }, // TODO: Add friend check
          ]
        },
        include: {
          user: { select: { name: true, image: true } }
        }
      });

      const usersAtEvent = locations.map(location => ({
        userId: location.userId,
        name: location.user.name || 'Unknown',
        image: location.user.image || undefined,
        distance: 0, // At event location
        lastSeen: location.updatedAt,
        isAtEvent: true,
        eventId: location.eventId || undefined,
      }));

      // Cache the results
      await redisManager.set(cacheKey, usersAtEvent, { ttl: 30 }); // 30 second cache

      return usersAtEvent;
    } catch (error) {
      console.error('Error getting users at event:', error);
      return [];
    }
  }

  /**
   * Set up geofencing for an event
   */
  async setupGeofencing(userId: string, settings: GeofenceSettings): Promise<void> {
    try {
      const { eventId, radius, alertTypes } = settings;

      // Verify event exists and user is attending
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        include: {
          attendees: {
            where: { userId },
            select: { userId: true }
          }
        }
      });

      if (!event) {
        throw new NotFoundError('Event not found');
      }

      if (event.attendees.length === 0) {
        throw new ValidationError('Must be attending event to set up geofencing');
      }

      // Create geofence alerts
      for (const alertType of alertTypes) {
        await this.prisma.geofenceAlert.upsert({
          where: {
            userId_eventId_alertType: {
              userId,
              eventId,
              alertType,
            }
          },
          update: {
            radius,
            isActive: true,
            triggered: false,
            triggeredAt: null,
          },
          create: {
            userId,
            eventId,
            alertType,
            radius,
            distance: 0,
            isActive: true,
          }
        });
      }

      console.log(`Geofencing set up for user ${userId} and event ${eventId}`);
    } catch (error) {
      console.error('Error setting up geofencing:', error);
      throw error;
    }
  }

  /**
   * Stop location sharing
   */
  async stopLocationSharing(userId: string): Promise<void> {
    try {
      await this.prisma.liveLocation.update({
        where: { userId },
        data: {
          isActive: false,
          sharingLevel: LocationSharingLevel.PRIVATE,
        }
      });

      // Remove from cache
      const cacheKey = this.USER_LOCATION_KEY(userId);
      await redisManager.del(cacheKey);

      // Broadcast stop sharing
      if (this.io) {
        this.io.emit('location_sharing_stopped', { userId });
      }

      console.log(`Location sharing stopped for user ${userId}`);
    } catch (error) {
      console.error('Error stopping location sharing:', error);
      throw error;
    }
  }

  /**
   * Get location analytics
   */
  async getLocationAnalytics(): Promise<LocationAnalytics> {
    try {
      // Try cache first
      const cachedAnalytics = await redisManager.get(this.LOCATION_ANALYTICS_KEY);
      if (cachedAnalytics) {
        return cachedAnalytics as LocationAnalytics;
      }

      // Calculate analytics
      const totalUsers = await this.prisma.liveLocation.count();
      const activeUsers = await this.prisma.liveLocation.count({
        where: {
          isActive: true,
          updatedAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } // Last 10 minutes
        }
      });
      const usersAtEvents = await this.prisma.liveLocation.count({
        where: { isAtEvent: true }
      });

      const locations = await this.prisma.liveLocation.findMany({
        where: { accuracy: { not: null } },
        select: { accuracy: true }
      });

      const averageAccuracy = locations.length > 0 
        ? locations.reduce((sum, loc) => sum + (loc.accuracy || 0), 0) / locations.length
        : 0;

      const analytics: LocationAnalytics = {
        totalUsers,
        activeUsers,
        usersAtEvents,
        averageAccuracy: Math.round(averageAccuracy),
        locationUpdatesPerMinute: 0, // TODO: Calculate from Redis metrics
      };

      // Cache analytics
      await redisManager.set(this.LOCATION_ANALYTICS_KEY, analytics, { ttl: this.ANALYTICS_TTL });

      return analytics;
    } catch (error) {
      console.error('Error getting location analytics:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        usersAtEvents: 0,
        averageAccuracy: 0,
        locationUpdatesPerMinute: 0,
      };
    }
  }

  /**
   * Private helper methods
   */

  private async cacheLocation(location: any): Promise<void> {
    const cacheKey = this.USER_LOCATION_KEY(location.userId);
    await redisManager.set(cacheKey, location, { ttl: this.LOCATION_TTL });
  }

  private async hasLocationPermission(userId: string, requesterId?: string, sharingLevel?: LocationSharingLevel): Promise<boolean> {
    if (!requesterId) return false;
    if (userId === requesterId) return true;

    switch (sharingLevel) {
      case LocationSharingLevel.PUBLIC:
        return true;
      case LocationSharingLevel.FRIENDS_ONLY:
        // TODO: Check if users are friends
        return true; // Simplified for now
      case LocationSharingLevel.EVENT_ONLY:
        // TODO: Check if users are at the same event
        return true; // Simplified for now
      case LocationSharingLevel.PRIVATE:
      default:
        return false;
    }
  }

  private async checkIfAtEvent(userId: string, eventId: string, lat: number, lng: number): Promise<boolean> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { lat: true, lng: true }
    });

    if (!event || !event.lat || !event.lng) {
      return false;
    }

    const distance = this.calculateDistance(lat, lng, event.lat, event.lng);
    return distance <= 100; // Within 100 meters of event location
  }

  private async addLocationHistory(userId: string, lat: number, lng: number, accuracy?: number, address?: string, eventId?: string): Promise<void> {
    try {
      await this.prisma.locationHistory.create({
        data: {
          userId,
          lat,
          lng,
          accuracy,
          address,
          eventId,
        }
      });
    } catch (error) {
      console.error('Error adding location history:', error);
    }
  }

  private async checkGeofences(userId: string, lat: number, lng: number): Promise<void> {
    try {
      const activeGeofences = await this.prisma.geofenceAlert.findMany({
        where: {
          userId,
          isActive: true,
          triggered: false,
        },
        include: {
          event: { select: { lat: true, lng: true, name: true } }
        }
      });

      for (const geofence of activeGeofences) {
        if (!geofence.event.lat || !geofence.event.lng) continue;

        const distance = this.calculateDistance(lat, lng, geofence.event.lat, geofence.event.lng);
        
        let shouldTrigger = false;
        
        switch (geofence.alertType) {
          case GeofenceAlertType.APPROACHING:
            shouldTrigger = distance <= geofence.radius && distance > 50;
            break;
          case GeofenceAlertType.ARRIVED:
            shouldTrigger = distance <= 50;
            break;
          case GeofenceAlertType.LEFT:
            shouldTrigger = distance > geofence.radius;
            break;
        }

        if (shouldTrigger) {
          await this.triggerGeofenceAlert(geofence.id, distance);
        }
      }
    } catch (error) {
      console.error('Error checking geofences:', error);
    }
  }

  private async triggerGeofenceAlert(geofenceId: string, distance: number): Promise<void> {
    try {
      await this.prisma.geofenceAlert.update({
        where: { id: geofenceId },
        data: {
          triggered: true,
          triggeredAt: new Date(),
          distance,
        }
      });

      // TODO: Send notification to user
      console.log(`Geofence alert triggered: ${geofenceId}`);
    } catch (error) {
      console.error('Error triggering geofence alert:', error);
    }
  }

  private async broadcastLocationUpdate(location: any): Promise<void> {
    if (!this.io) return;

    const room = `user_${location.userId}`;
    this.io.to(room).emit('location_updated', {
      userId: location.userId,
      lat: location.lat,
      lng: location.lng,
      accuracy: location.accuracy,
      isAtEvent: location.isAtEvent,
      eventId: location.eventId,
      updatedAt: location.updatedAt,
    });
  }

  private async updateLocationAnalytics(): Promise<void> {
    // Invalidate analytics cache to force recalculation
    await redisManager.del(this.LOCATION_ANALYTICS_KEY);
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

// Export singleton instance
export const liveLocationService = new LiveLocationService(); 