"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const eventController_1 = require("../controllers/eventController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const rateLimit_1 = require("../middleware/rateLimit");
const validation_2 = require("../utils/validation");
const router = (0, express_1.Router)();
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
router.get('/', rateLimit_1.apiLimiter, eventController_1.eventController.getEvents);
/**
 * Get event by ID
 * GET /api/events/:id
 */
router.get('/:id', rateLimit_1.apiLimiter, eventController_1.eventController.getEventById);
/**
 * Get event attendees
 * GET /api/events/:id/attendees
 * Query params: rsvp (filter by RSVP status)
 */
router.get('/:id/attendees', rateLimit_1.apiLimiter, eventController_1.eventController.getEventAttendees);
/**
 * Get user's events (hosted and attending)
 * GET /api/events/user/:userId
 */
router.get('/user/:userId', rateLimit_1.apiLimiter, eventController_1.eventController.getUserEvents);
// ============================================================================
// Authenticated Event Routes
// ============================================================================
/**
 * Create a new event
 * POST /api/events
 */
router.post('/', rateLimit_1.eventCreationLimiter, // Special rate limiting for event creation
auth_1.authenticate, (0, validation_1.validateBody)(validation_2.createEventSchema), eventController_1.eventController.createEvent);
/**
 * Update an event
 * PUT /api/events/:id
 */
router.put('/:id', rateLimit_1.apiLimiter, auth_1.authenticate, eventController_1.eventController.updateEvent);
/**
 * Delete/Archive an event
 * DELETE /api/events/:id
 */
router.delete('/:id', rateLimit_1.apiLimiter, auth_1.authenticate, eventController_1.eventController.deleteEvent);
/**
 * RSVP to an event
 * POST /api/events/:id/rsvp
 * Body: { rsvp: "YES" | "NO" | "MAYBE" | "PENDING" }
 */
router.post('/:id/rsvp', rateLimit_1.apiLimiter, auth_1.authenticate, eventController_1.eventController.rsvpToEvent);
/**
 * Remove attendee from event
 * DELETE /api/events/:id/attendees/:userId
 */
router.delete('/:id/attendees/:userId', rateLimit_1.apiLimiter, auth_1.authenticate, eventController_1.eventController.removeAttendee);
exports.default = router;
