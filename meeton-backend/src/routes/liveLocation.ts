import express from 'express';
import { liveLocationService } from '../services/liveLocationService';
import { authenticate } from '../middleware/auth';
import { ApiResponse } from '../utils/apiResponse';
import { ValidationError } from '../utils/errors';

const router = express.Router();

/**
 * @route POST /api/live-location/update
 * @desc Update user's live location
 * @access Private
 */
router.post('/update',
  authenticate,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { lat, lng, accuracy, heading, speed, altitude, batteryLevel, eventId } = req.body;

      // Basic validation
      if (typeof lat !== 'number' || lat < -90 || lat > 90) {
        res.status(400).json(ApiResponse.error('Invalid latitude'));
        return;
      }
      if (typeof lng !== 'number' || lng < -180 || lng > 180) {
        res.status(400).json(ApiResponse.error('Invalid longitude'));
        return;
      }

      await liveLocationService.updateLocation({
        userId,
        lat,
        lng,
        accuracy,
        heading,
        speed,
        altitude,
        batteryLevel,
        eventId
      });

      res.json(ApiResponse.success(null, 'Location updated successfully'));
    } catch (error) {
      console.error('Update location error:', error);
      res.status(500).json(ApiResponse.error('Failed to update location', error));
    }
  }
);

/**
 * @route PUT /api/live-location/sharing
 * @desc Update location sharing settings
 * @access Private
 */
router.put('/sharing',
  authenticate,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { sharingLevel, eventId, expiresIn } = req.body;

      // Validate sharing level
      const validLevels = ['PRIVATE', 'FRIENDS_ONLY', 'EVENT_ONLY', 'PUBLIC'];
      if (!validLevels.includes(sharingLevel)) {
        res.status(400).json(ApiResponse.error('Invalid sharing level'));
        return;
      }

      let sharingExpiresAt: Date | undefined;
      if (expiresIn) {
        sharingExpiresAt = new Date(Date.now() + expiresIn * 60 * 1000);
      }

      await liveLocationService.updateSharingSettings(userId, {
        sharingLevel,
        sharingExpiresAt,
        eventId
      });

      res.json(ApiResponse.success({
        sharingLevel,
        eventId,
        expiresAt: sharingExpiresAt
      }, 'Sharing settings updated successfully'));
    } catch (error) {
      console.error('Update sharing settings error:', error);
      res.status(500).json(ApiResponse.error('Failed to update sharing settings', error));
    }
  }
);

/**
 * @route GET /api/live-location/user/:userId
 * @desc Get user's current location
 * @access Private
 */
router.get('/user/:userId',
  authenticate,
  async (req, res) => {
    try {
      const requesterId = req.user!.id;
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json(ApiResponse.error('User ID is required'));
        return;
      }

      const location = await liveLocationService.getUserLocation(userId, requesterId);
      res.json(ApiResponse.success(location, 'Location retrieved successfully'));
    } catch (error) {
      console.error('Get user location error:', error);
      
      if (error instanceof ValidationError) {
        res.status(403).json(ApiResponse.error(error.message));
      } else {
        res.status(500).json(ApiResponse.error('Failed to get user location', error));
      }
    }
  }
);

/**
 * @route GET /api/live-location/nearby
 * @desc Get nearby users
 * @access Private
 */
router.get('/nearby',
  authenticate,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const radius = parseInt(req.query.radius as string) || 1000;

      const nearbyUsers = await liveLocationService.getNearbyUsers(userId, radius);
      res.json(ApiResponse.success(nearbyUsers, 'Nearby users retrieved successfully'));
    } catch (error) {
      console.error('Get nearby users error:', error);
      res.status(500).json(ApiResponse.error('Failed to get nearby users', error));
    }
  }
);

/**
 * @route GET /api/live-location/event/:eventId
 * @desc Get users at event location
 * @access Private
 */
router.get('/event/:eventId',
  authenticate,
  async (req, res) => {
    try {
      const requesterId = req.user!.id;
      const { eventId } = req.params;

      if (!eventId) {
        res.status(400).json(ApiResponse.error('Event ID is required'));
        return;
      }

      const usersAtEvent = await liveLocationService.getUsersAtEvent(eventId, requesterId);
      res.json(ApiResponse.success(usersAtEvent, 'Event locations retrieved successfully'));
    } catch (error) {
      console.error('Get event locations error:', error);
      
      if (error instanceof ValidationError) {
        res.status(403).json(ApiResponse.error(error.message));
      } else {
        res.status(500).json(ApiResponse.error('Failed to get event locations', error));
      }
    }
  }
);

/**
 * @route POST /api/live-location/geofencing
 * @desc Setup geofencing for an event
 * @access Private
 */
router.post('/geofencing',
  authenticate,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { eventId, radius, alertTypes } = req.body;

      // Basic validation
      if (!eventId) {
        res.status(400).json(ApiResponse.error('Event ID is required'));
        return;
      }
      if (typeof radius !== 'number' || radius < 50 || radius > 10000) {
        res.status(400).json(ApiResponse.error('Invalid radius (50-10000 meters)'));
        return;
      }
      if (!Array.isArray(alertTypes) || alertTypes.length === 0) {
        res.status(400).json(ApiResponse.error('Alert types must be a non-empty array'));
        return;
      }

      await liveLocationService.setupGeofencing(userId, {
        eventId,
        radius,
        alertTypes
      });

      res.json(ApiResponse.success({
        eventId,
        radius,
        alertTypes
      }, 'Geofencing setup successfully'));
    } catch (error) {
      console.error('Setup geofencing error:', error);
      
      if (error instanceof ValidationError) {
        res.status(400).json(ApiResponse.error(error.message));
      } else {
        res.status(500).json(ApiResponse.error('Failed to setup geofencing', error));
      }
    }
  }
);

/**
 * @route DELETE /api/live-location/sharing
 * @desc Stop location sharing
 * @access Private
 */
router.delete('/sharing',
  authenticate,
  async (req, res) => {
    try {
      const userId = req.user!.id;

      await liveLocationService.stopLocationSharing(userId);
      res.json(ApiResponse.success(null, 'Location sharing stopped successfully'));
    } catch (error) {
      console.error('Stop location sharing error:', error);
      res.status(500).json(ApiResponse.error('Failed to stop location sharing', error));
    }
  }
);

/**
 * @route GET /api/live-location/analytics
 * @desc Get location analytics
 * @access Private (Admin only)
 */
router.get('/analytics',
  authenticate,
  async (req, res) => {
    try {
      // TODO: Add admin check
      const analytics = await liveLocationService.getLocationAnalytics();
      res.json(ApiResponse.success(analytics, 'Location analytics retrieved successfully'));
    } catch (error) {
      console.error('Get location analytics error:', error);
      res.status(500).json(ApiResponse.error('Failed to get location analytics', error));
    }
  }
);

/**
 * @route GET /api/live-location/history
 * @desc Get user's location history
 * @access Private
 */
router.get('/history',
  authenticate,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const eventId = req.query.eventId as string;

      // Get location history from database
      const whereClause: any = { userId };
      if (eventId) {
        whereClause.eventId = eventId;
      }

      const history = await (liveLocationService as any).prisma.locationHistory.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          event: {
            select: {
              id: true,
              name: true,
              location: true,
            }
          }
        }
      });

      const total = await (liveLocationService as any).prisma.locationHistory.count({
        where: whereClause
      });

      res.json(ApiResponse.success({
        history,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }, 'Location history retrieved successfully'));
    } catch (error) {
      console.error('Get location history error:', error);
      res.status(500).json(ApiResponse.error('Failed to get location history', error));
    }
  }
);

/**
 * @route GET /api/live-location/geofences
 * @desc Get user's active geofences
 * @access Private
 */
router.get('/geofences',
  authenticate,
  async (req, res) => {
    try {
      const userId = req.user!.id;

      const geofences = await (liveLocationService as any).prisma.geofenceAlert.findMany({
        where: {
          userId,
          isActive: true
        },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              location: true,
              date: true,
              lat: true,
              lng: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json(ApiResponse.success(geofences, 'Geofences retrieved successfully'));
    } catch (error) {
      console.error('Get geofences error:', error);
      res.status(500).json(ApiResponse.error('Failed to get geofences', error));
    }
  }
);

/**
 * @route DELETE /api/live-location/geofences/:geofenceId
 * @desc Disable a geofence
 * @access Private
 */
router.delete('/geofences/:geofenceId',
  authenticate,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { geofenceId } = req.params;

      if (!geofenceId) {
        res.status(400).json(ApiResponse.error('Geofence ID is required'));
        return;
      }

      await (liveLocationService as any).prisma.geofenceAlert.updateMany({
        where: {
          id: geofenceId,
          userId, // Ensure user owns this geofence
        },
        data: {
          isActive: false
        }
      });

      res.json(ApiResponse.success(null, 'Geofence disabled successfully'));
    } catch (error) {
      console.error('Disable geofence error:', error);
      res.status(500).json(ApiResponse.error('Failed to disable geofence', error));
    }
  }
);

export default router; 