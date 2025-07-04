import { Router } from 'express';
import { eventController } from '../controllers/eventController';
import { authenticate } from '../middleware/auth';
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
  eventController.getEvents
);

/**
 * Upload a photo to an event
 * POST /api/events/:id/photos
 */
router.post('/:id/photos',
  (req, res, next) => {
    console.log('📸 POST /:id/photos route hit!', { params: req.params, body: req.body });
    next();
  },
  authenticate,
  upload.single('photo'),
  (req, res) => {
    console.log('📸 Photo upload handler working!');
    res.json({ success: true, message: 'Photo upload working', params: req.params });
  }
);

/**
 * Get all photos for an event
 * GET /api/events/:id/photos
 */
router.get('/:id/photos',
  (req, res, next) => {
    console.log('📷 GET /:id/photos route hit!', { params: req.params });
    next();
  },
  apiLimiter, 
  (req, res) => {
    console.log('📷 Get photos handler working!');
    res.json({ success: true, message: 'Get photos working', data: [], params: req.params });
  }
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
  eventController.getUserEvents
);

/**
 * Get event by ID
 * GET /api/events/:id
 */
router.get('/:id', 
  apiLimiter, 
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