import { Router } from 'express';
import { eventController } from '../controllers/eventController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { eventCreationLimiter, apiLimiter } from '../middleware/rateLimit';
import { createEventSchema } from '../utils/validation';
import upload from '../config/multer';

const router = Router();

console.log('📁 Events routes file loaded');
console.log('🔍 eventController:', eventController);
console.log('🔍 eventController.uploadEventPhoto:', eventController.uploadEventPhoto);

/**
 * Event Routes - /api/events
 * All routes are properly authenticated and rate-limited
 */

// ============================================================================
// Public Event Routes (with basic rate limiting)
// ============================================================================

/**
 * Get events with filtering and pagination
 * GET /api/events
 * Query params: page, limit, category, privacy, search, hostId, attendeeId, startDate, endDate, sortBy, sortOrder
 */
router.get('/', 
  apiLimiter, 
  optionalAuth,  // Use optional auth to get user context if available
  eventController.getEvents
);

/**
 * Upload a photo to an event
 * POST /api/events/:id/photos
 */
router.post('/:id/photos',
  authenticate,
  upload.single('photo'),
  eventController.uploadEventPhoto
);

/**
 * Get all photos for an event
 * GET /api/events/:id/photos
 */
router.get('/:id/photos',
  apiLimiter, 
  eventController.getEventPhotos
);

/**
 * Get event attendees
 * GET /api/events/:id/attendees
 * Query params: rsvp (filter by RSVP status)
 */
router.get('/:id/attendees', 
  apiLimiter, 
  eventController.getEventAttendees
);

/**
 * Get user's events (hosted and attending)
 * GET /api/events/user/:userId
 */
router.get('/user/:userId', 
  apiLimiter,
  authenticate, 
  eventController.getUserEvents
);

/**
 * Get event by ID
 * GET /api/events/:id
 */
router.get('/:id', 
  apiLimiter, 
  optionalAuth,  // Use optional auth for proper privacy filtering
  eventController.getEventById
);

// ============================================================================
// Authenticated Event Routes
// ============================================================================

/**
 * Create a new event
 * POST /api/events
 */
router.post('/', 
  eventCreationLimiter, // Special rate limiting for event creation
  authenticate,
  validateBody(createEventSchema),
  eventController.createEvent
);

/**
 * Update an event
 * PUT /api/events/:id
 */
router.put('/:id', 
  apiLimiter,
  authenticate,
  eventController.updateEvent
);

/**
 * Delete/Archive an event
 * DELETE /api/events/:id
 */
router.delete('/:id', 
  apiLimiter,
  authenticate,
  eventController.deleteEvent
);

/**
 * RSVP to an event
 * POST /api/events/:id/rsvp
 * Body: { rsvp: "YES" | "NO" | "MAYBE" | "PENDING" }
 */
router.post('/:id/rsvp', 
  apiLimiter,
  authenticate,
  eventController.rsvpToEvent
);

/**
 * Invite users to an event
 * POST /api/events/:id/invite
 * Body: { userIds: string[], customMessage?: string }
 */
router.post('/:id/invite', 
  apiLimiter,
  authenticate,
  eventController.inviteUsersToEvent
);

/**
 * Remove attendee from event
 * DELETE /api/events/:id/attendees/:userId
 */
router.delete('/:id/attendees/:userId', 
  apiLimiter,
  authenticate,
  eventController.removeAttendee
);

console.log('📋 Router has', router.stack?.length || 0, 'routes defined');

export default router; 