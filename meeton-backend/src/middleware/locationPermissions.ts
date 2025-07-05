import { Request, Response, NextFunction } from 'express';
import { PrismaClient, LocationSharingLevel } from '@prisma/client';
import DatabaseManager from '../config/database';
import { ValidationError, NotFoundError } from '../utils/errors';
import { ApiResponse } from '../utils/apiResponse';

/**
 * Location Permissions Middleware
 * Handles privacy controls and access permissions for location data
 */

interface LocationPermissionRequest extends Request {
  locationPermissions?: {
    canViewLocation: boolean;
    canViewHistory: boolean;
    canSetupGeofencing: boolean;
    sharingLevel: LocationSharingLevel;
  };
}

/**
 * Check if user has permission to view another user's location
 */
export const checkLocationViewPermission = async (
  req: LocationPermissionRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const requesterId = req.user!.id;
    const targetUserId = req.params.userId || req.body.userId;

    if (!targetUserId) {
      return res.status(400).json(ApiResponse.error('Target user ID is required'));
    }

    // Users can always view their own location
    if (requesterId === targetUserId) {
      req.locationPermissions = {
        canViewLocation: true,
        canViewHistory: true,
        canSetupGeofencing: true,
        sharingLevel: LocationSharingLevel.PUBLIC
      };
      return next();
    }

    const prisma = DatabaseManager.getInstance();

    // Get target user's location sharing settings
    const targetLocation = await prisma.liveLocation.findUnique({
      where: { userId: targetUserId },
      select: {
        sharingLevel: true,
        sharingExpiresAt: true,
        eventId: true,
        isActive: true
      }
    });

    if (!targetLocation || !targetLocation.isActive) {
      return res.status(404).json(ApiResponse.error('Location not found or sharing disabled'));
    }

    // Check if sharing has expired
    if (targetLocation.sharingExpiresAt && targetLocation.sharingExpiresAt < new Date()) {
      return res.status(403).json(ApiResponse.error('Location sharing has expired'));
    }

    let canViewLocation = false;
    let canViewHistory = false;

    switch (targetLocation.sharingLevel) {
      case LocationSharingLevel.PUBLIC:
        canViewLocation = true;
        break;

      case LocationSharingLevel.FRIENDS_ONLY:
        canViewLocation = await areFriends(requesterId, targetUserId);
        break;

      case LocationSharingLevel.EVENT_ONLY:
        if (targetLocation.eventId) {
          canViewLocation = await areAtSameEvent(requesterId, targetUserId, targetLocation.eventId);
        }
        break;

      case LocationSharingLevel.PRIVATE:
      default:
        canViewLocation = false;
        break;
    }

    if (!canViewLocation) {
      return res.status(403).json(ApiResponse.error('No permission to view this location'));
    }

    req.locationPermissions = {
      canViewLocation,
      canViewHistory: canViewLocation, // Same permission for now
      canSetupGeofencing: false, // Only for own location
      sharingLevel: targetLocation.sharingLevel
    };

    next();
  } catch (error) {
    console.error('Location permission check error:', error);
    res.status(500).json(ApiResponse.error('Failed to check location permissions', error));
  }
};

/**
 * Check if user has permission to view event locations
 */
export const checkEventLocationPermission = async (
  req: LocationPermissionRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const requesterId = req.user!.id;
    const eventId = req.params.eventId || req.body.eventId;

    if (!eventId) {
      return res.status(400).json(ApiResponse.error('Event ID is required'));
    }

    const prisma = DatabaseManager.getInstance();

    // Check if user is attending the event
    const attendee = await prisma.attendee.findUnique({
      where: {
        userId_eventId: {
          userId: requesterId,
          eventId: eventId
        }
      },
      include: {
        event: {
          select: {
            hostId: true,
            privacyLevel: true
          }
        }
      }
    });

    if (!attendee) {
      return res.status(403).json(ApiResponse.error('Must be attending event to view locations'));
    }

    // Check if user has RSVP'd yes
    if (attendee.rsvp !== 'YES') {
      return res.status(403).json(ApiResponse.error('Must RSVP yes to view event locations'));
    }

    req.locationPermissions = {
      canViewLocation: true,
      canViewHistory: false,
      canSetupGeofencing: true,
      sharingLevel: LocationSharingLevel.EVENT_ONLY
    };

    next();
  } catch (error) {
    console.error('Event location permission check error:', error);
    res.status(500).json(ApiResponse.error('Failed to check event location permissions', error));
  }
};

/**
 * Validate location coordinates
 */
export const validateLocationCoordinates = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { lat, lng } = req.body;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json(ApiResponse.error('Latitude and longitude must be numbers'));
  }

  if (lat < -90 || lat > 90) {
    return res.status(400).json(ApiResponse.error('Latitude must be between -90 and 90'));
  }

  if (lng < -180 || lng > 180) {
    return res.status(400).json(ApiResponse.error('Longitude must be between -180 and 180'));
  }

  next();
};

/**
 * Rate limit location updates
 */
export const rateLimitLocationUpdates = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // This will be handled by the main rate limiting middleware
  // But we can add location-specific limits here if needed
  
  const userAgent = req.get('User-Agent') || '';
  const isHighFrequencyClient = userAgent.includes('MeetOnApp'); // Your mobile app
  
  // Allow higher frequency for mobile apps
  if (isHighFrequencyClient) {
    // Mobile apps can update more frequently
    next();
  } else {
    // Web clients have lower limits
    next();
  }
};

/**
 * Validate geofencing parameters
 */
export const validateGeofencingParams = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { radius, alertTypes } = req.body;

  if (typeof radius !== 'number' || radius < 50 || radius > 10000) {
    return res.status(400).json(ApiResponse.error('Radius must be between 50 and 10000 meters'));
  }

  if (!Array.isArray(alertTypes) || alertTypes.length === 0) {
    return res.status(400).json(ApiResponse.error('Alert types must be a non-empty array'));
  }

  const validAlertTypes = ['APPROACHING', 'ARRIVED', 'LEFT', 'REMINDER'];
  const invalidTypes = alertTypes.filter(type => !validAlertTypes.includes(type));
  
  if (invalidTypes.length > 0) {
    return res.status(400).json(ApiResponse.error(`Invalid alert types: ${invalidTypes.join(', ')}`));
  }

  next();
};

/**
 * Check battery level and warn if low
 */
export const checkBatteryLevel = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { batteryLevel } = req.body;

  if (typeof batteryLevel === 'number' && batteryLevel < 20) {
    // Add warning to response but don't block the request
    res.locals.batteryWarning = 'Battery level is low. Consider enabling battery optimization.';
  }

  next();
};

/**
 * Validate location sharing duration
 */
export const validateSharingDuration = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { expiresIn } = req.body;

  if (expiresIn !== undefined) {
    if (typeof expiresIn !== 'number' || expiresIn < 1 || expiresIn > 1440) { // Max 24 hours
      return res.status(400).json(ApiResponse.error('Sharing duration must be between 1 and 1440 minutes'));
    }
  }

  next();
};

/**
 * Helper functions
 */

async function areFriends(userId1: string, userId2: string): Promise<boolean> {
  const prisma = DatabaseManager.getInstance();
  
  const friendship = await prisma.friendRequest.findFirst({
    where: {
      OR: [
        { senderId: userId1, receiverId: userId2, status: 'ACCEPTED' },
        { senderId: userId2, receiverId: userId1, status: 'ACCEPTED' }
      ]
    }
  });

  return !!friendship;
}

async function areAtSameEvent(userId1: string, userId2: string, eventId: string): Promise<boolean> {
  const prisma = DatabaseManager.getInstance();
  
  const attendees = await prisma.attendee.findMany({
    where: {
      eventId,
      userId: { in: [userId1, userId2] },
      rsvp: 'YES'
    }
  });

  return attendees.length === 2;
}

/**
 * Location privacy decorator for responses
 */
export const applyLocationPrivacy = (
  req: LocationPermissionRequest,
  res: Response,
  next: NextFunction
) => {
  const originalJson = res.json;
  
  res.json = function(data: any) {
    if (req.locationPermissions && data.data) {
      // Apply privacy filters based on permissions
      if (!req.locationPermissions.canViewLocation) {
        // Remove sensitive location data
        delete data.data.lat;
        delete data.data.lng;
        delete data.data.address;
        delete data.data.accuracy;
      }
      
      if (!req.locationPermissions.canViewHistory) {
        delete data.data.locationHistory;
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}; 