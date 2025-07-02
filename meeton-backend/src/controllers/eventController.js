"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventController = void 0;
const eventService_1 = require("../services/eventService");
const errorHandler_1 = require("../middleware/errorHandler");
const errors_1 = require("../utils/errors");
const validation_1 = require("../utils/validation");
const prisma_1 = require("../generated/prisma");
/**
 * Event Controller - Controllers ONLY handle HTTP concerns
 * Following strict controller pattern from implementation rules
 */
class EventController {
    constructor() {
        // Bind all methods to preserve 'this' context
        this.createEvent = this.createEvent.bind(this);
        this.getEvents = this.getEvents.bind(this);
        this.getEventById = this.getEventById.bind(this);
        this.updateEvent = this.updateEvent.bind(this);
        this.deleteEvent = this.deleteEvent.bind(this);
        this.rsvpToEvent = this.rsvpToEvent.bind(this);
        this.removeAttendee = this.removeAttendee.bind(this);
        this.getEventAttendees = this.getEventAttendees.bind(this);
        this.getUserEvents = this.getUserEvents.bind(this);
    }
    /**
     * Create a new event
     * POST /api/events
     */
    createEvent(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!req.user) {
                    throw new errors_1.AuthenticationError('Authentication required');
                }
                const validatedData = validation_1.createEventSchema.parse(req.body);
                const event = yield eventService_1.eventService.createEvent(req.user.id, validatedData);
                (0, errorHandler_1.sendSuccess)(res, event, 'Event created successfully', 201);
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Get events with filtering and pagination
     * GET /api/events
     */
    getEvents(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { page = '1', limit = '20', category, privacy, search, hostId, attendeeId, startDate, endDate, sortBy = 'date', sortOrder = 'asc', } = req.query;
                const options = {
                    page: parseInt(page, 10),
                    limit: Math.min(parseInt(limit, 10), 100), // Max 100 events per page
                    category: category,
                    privacyLevel: privacy,
                    search: search,
                    hostId: hostId,
                    attendeeId: attendeeId,
                    startDate: startDate ? new Date(startDate) : undefined,
                    endDate: endDate ? new Date(endDate) : undefined,
                    sortBy: sortBy,
                    sortOrder: sortOrder,
                };
                const result = yield eventService_1.eventService.getEvents(options);
                (0, errorHandler_1.sendSuccess)(res, result.events, 'Events retrieved successfully', 200, {
                    page: result.page,
                    limit: options.limit,
                    total: result.total,
                    totalPages: result.totalPages,
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Get event by ID
     * GET /api/events/:id
     */
    getEventById(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { id } = req.params;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const event = yield eventService_1.eventService.getEventById(id, userId);
                if (!event) {
                    throw new errors_1.NotFoundError('Event not found');
                }
                (0, errorHandler_1.sendSuccess)(res, event, 'Event retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Update an event
     * PUT /api/events/:id
     */
    updateEvent(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!req.user) {
                    throw new errors_1.AuthenticationError('Authentication required');
                }
                const { id } = req.params;
                // Note: Using partial validation for updates
                const updateData = req.body;
                const event = yield eventService_1.eventService.updateEvent(id, req.user.id, updateData);
                (0, errorHandler_1.sendSuccess)(res, event, 'Event updated successfully');
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Delete/Archive an event
     * DELETE /api/events/:id
     */
    deleteEvent(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!req.user) {
                    throw new errors_1.AuthenticationError('Authentication required');
                }
                const { id } = req.params;
                yield eventService_1.eventService.deleteEvent(id, req.user.id);
                (0, errorHandler_1.sendSuccess)(res, null, 'Event deleted successfully');
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * RSVP to an event
     * POST /api/events/:id/rsvp
     */
    rsvpToEvent(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!req.user) {
                    throw new errors_1.AuthenticationError('Authentication required');
                }
                const { id } = req.params;
                const { rsvp } = req.body;
                // Validate RSVP value
                if (!Object.values(prisma_1.RSVP).includes(rsvp)) {
                    throw new errors_1.ValidationError('Invalid RSVP value. Must be YES, NO, MAYBE, or PENDING');
                }
                const attendee = yield eventService_1.eventService.addAttendee(id, req.user.id, rsvp);
                (0, errorHandler_1.sendSuccess)(res, attendee, 'RSVP updated successfully');
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Remove attendee from event
     * DELETE /api/events/:id/attendees/:userId
     */
    removeAttendee(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!req.user) {
                    throw new errors_1.AuthenticationError('Authentication required');
                }
                const { id, userId } = req.params;
                yield eventService_1.eventService.removeAttendee(id, userId, req.user.id);
                (0, errorHandler_1.sendSuccess)(res, null, 'Attendee removed successfully');
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Get event attendees
     * GET /api/events/:id/attendees
     */
    getEventAttendees(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { rsvp } = req.query;
                // Validate RSVP filter if provided
                let rsvpFilter;
                if (rsvp && Object.values(prisma_1.RSVP).includes(rsvp)) {
                    rsvpFilter = rsvp;
                }
                const attendees = yield eventService_1.eventService.getEventAttendees(id, rsvpFilter);
                (0, errorHandler_1.sendSuccess)(res, attendees, 'Event attendees retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Get user's events (hosted and attending)
     * GET /api/events/user/:userId
     */
    getUserEvents(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!req.user) {
                    throw new errors_1.AuthenticationError('Authentication required');
                }
                const { userId } = req.params;
                // Users can only view their own events unless it's public data
                // For now, allow viewing any user's events (can be restricted later)
                const events = yield eventService_1.eventService.getUserEvents(userId);
                (0, errorHandler_1.sendSuccess)(res, events, 'User events retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        });
    }
}
// Export controller instance
exports.eventController = new EventController();
