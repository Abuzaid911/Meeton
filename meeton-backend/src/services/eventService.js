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
exports.eventService = void 0;
const prisma_1 = require("../generated/prisma");
const database_1 = require("../config/database");
const errors_1 = require("../utils/errors");
/**
 * Event Service - ALL event business logic MUST be in this service layer
 * Handles event creation, updates, deletion, queries, and attendee management
 */
class EventService {
    /**
     * Create a new event
     */
    createEvent(hostId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Convert date strings to Date objects if needed
                const eventDate = typeof data.date === 'string' ? new Date(data.date) : data.date;
                const rsvpDeadline = data.rsvpDeadline
                    ? (typeof data.rsvpDeadline === 'string' ? new Date(data.rsvpDeadline) : data.rsvpDeadline)
                    : undefined;
                // Validate that the event date is in the future
                if (eventDate <= new Date()) {
                    throw new errors_1.ValidationError('Event date must be in the future');
                }
                // Validate RSVP deadline if provided
                if (rsvpDeadline && rsvpDeadline >= eventDate) {
                    throw new errors_1.ValidationError('RSVP deadline must be before the event date');
                }
                // Create the event
                const event = yield database_1.prisma.event.create({
                    data: {
                        name: data.name,
                        date: eventDate,
                        time: data.time,
                        location: data.location,
                        lat: data.lat,
                        lng: data.lng,
                        description: data.description,
                        duration: data.duration,
                        capacity: data.capacity,
                        rsvpDeadline,
                        headerType: data.headerType,
                        headerColor: data.headerColor,
                        headerImageUrl: data.headerImageUrl,
                        category: data.category,
                        tags: data.tags || [],
                        privacyLevel: data.privacyLevel,
                        ticketPrice: data.ticketPrice,
                        externalUrl: data.externalUrl,
                        hostId,
                    },
                    include: {
                        host: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                image: true,
                            },
                        },
                        attendees: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        username: true,
                                        image: true,
                                    },
                                },
                            },
                        },
                        _count: {
                            select: {
                                attendees: true,
                                comments: true,
                                photos: true,
                            },
                        },
                    },
                });
                // Automatically add the host as an attendee with YES RSVP
                yield this.addAttendee(event.id, hostId, prisma_1.RSVP.YES);
                return event;
            }
            catch (error) {
                if (error instanceof errors_1.ValidationError) {
                    throw error;
                }
                console.error('Error creating event:', error);
                throw new errors_1.ValidationError('Failed to create event');
            }
        });
    }
    /**
     * Get event by ID with full details
     */
    getEventById(eventId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const event = yield database_1.prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    host: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            image: true,
                        },
                    },
                    attendees: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    username: true,
                                    image: true,
                                },
                            },
                        },
                    },
                    comments: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    username: true,
                                    image: true,
                                },
                            },
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 10, // Limit initial comments
                    },
                    photos: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    username: true,
                                    image: true,
                                },
                            },
                        },
                        orderBy: { uploadedAt: 'desc' },
                        take: 20, // Limit initial photos
                    },
                    _count: {
                        select: {
                            attendees: true,
                            comments: true,
                            photos: true,
                        },
                    },
                },
            });
            if (!event) {
                return null;
            }
            // Check privacy permissions
            if (userId && !this.canUserViewEvent(event, userId)) {
                throw new errors_1.AuthorizationError('You do not have permission to view this event');
            }
            // Increment view count if not the host viewing their own event
            if (userId && userId !== event.hostId) {
                yield database_1.prisma.event.update({
                    where: { id: eventId },
                    data: { viewCount: { increment: 1 } },
                });
            }
            return event;
        });
    }
    /**
     * Get events with filtering and pagination
     */
    getEvents() {
        return __awaiter(this, arguments, void 0, function* (options = {}) {
            const { page = 1, limit = 20, category, privacyLevel, search, hostId, attendeeId, startDate, endDate, sortBy = 'date', sortOrder = 'asc', } = options;
            const skip = (page - 1) * limit;
            // Build where clause
            const where = {
                isArchived: false,
                cancelledAt: null,
            };
            if (category) {
                where.category = category;
            }
            if (privacyLevel) {
                where.privacyLevel = privacyLevel;
            }
            if (search) {
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { location: { contains: search, mode: 'insensitive' } },
                    { category: { contains: search, mode: 'insensitive' } },
                ];
            }
            if (hostId) {
                where.hostId = hostId;
            }
            if (attendeeId) {
                where.attendees = {
                    some: {
                        userId: attendeeId,
                        rsvp: { in: [prisma_1.RSVP.YES, prisma_1.RSVP.MAYBE] },
                    },
                };
            }
            if (startDate || endDate) {
                where.date = {};
                if (startDate) {
                    where.date.gte = startDate;
                }
                if (endDate) {
                    where.date.lte = endDate;
                }
            }
            // Build order by clause
            let orderBy;
            switch (sortBy) {
                case 'created':
                    orderBy = { createdAt: sortOrder };
                    break;
                case 'name':
                    orderBy = { name: sortOrder };
                    break;
                case 'popularity':
                    orderBy = [
                        { viewCount: 'desc' },
                        { attendees: { _count: 'desc' } },
                    ];
                    break;
                default:
                    orderBy = { date: sortOrder };
            }
            // Execute queries
            const [events, total] = yield Promise.all([
                database_1.prisma.event.findMany({
                    where,
                    orderBy,
                    skip,
                    take: limit,
                    include: {
                        host: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                image: true,
                            },
                        },
                        attendees: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        username: true,
                                        image: true,
                                    },
                                },
                            },
                        },
                        _count: {
                            select: {
                                attendees: true,
                                comments: true,
                                photos: true,
                            },
                        },
                    },
                }),
                database_1.prisma.event.count({ where }),
            ]);
            const totalPages = Math.ceil(total / limit);
            return {
                events,
                total,
                page,
                totalPages,
            };
        });
    }
    /**
     * Update an event
     */
    updateEvent(eventId, hostId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Verify the user owns this event
            const existingEvent = yield database_1.prisma.event.findUnique({
                where: { id: eventId },
            });
            if (!existingEvent) {
                throw new errors_1.NotFoundError('Event not found');
            }
            if (existingEvent.hostId !== hostId) {
                throw new errors_1.AuthorizationError('Only the event host can update this event');
            }
            // Prepare update data
            const updateData = Object.assign({}, data);
            // Convert dates if provided
            if (data.date) {
                updateData.date = typeof data.date === 'string' ? new Date(data.date) : data.date;
                // Validate future date
                if (updateData.date <= new Date()) {
                    throw new errors_1.ValidationError('Event date must be in the future');
                }
            }
            if (data.rsvpDeadline) {
                updateData.rsvpDeadline = typeof data.rsvpDeadline === 'string'
                    ? new Date(data.rsvpDeadline)
                    : data.rsvpDeadline;
                // Validate RSVP deadline
                const eventDate = updateData.date || existingEvent.date;
                if (updateData.rsvpDeadline >= eventDate) {
                    throw new errors_1.ValidationError('RSVP deadline must be before the event date');
                }
            }
            const updatedEvent = yield database_1.prisma.event.update({
                where: { id: eventId },
                data: updateData,
                include: {
                    host: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            image: true,
                        },
                    },
                    attendees: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    username: true,
                                    image: true,
                                },
                            },
                        },
                    },
                    _count: {
                        select: {
                            attendees: true,
                            comments: true,
                            photos: true,
                        },
                    },
                },
            });
            return updatedEvent;
        });
    }
    /**
     * Delete/Archive an event
     */
    deleteEvent(eventId, hostId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Verify the user owns this event
            const existingEvent = yield database_1.prisma.event.findUnique({
                where: { id: eventId },
            });
            if (!existingEvent) {
                throw new errors_1.NotFoundError('Event not found');
            }
            if (existingEvent.hostId !== hostId) {
                throw new errors_1.AuthorizationError('Only the event host can delete this event');
            }
            // Soft delete by archiving
            yield database_1.prisma.event.update({
                where: { id: eventId },
                data: {
                    isArchived: true,
                    archivedAt: new Date(),
                },
            });
        });
    }
    /**
     * Add attendee to event (RSVP)
     */
    addAttendee(eventId_1, userId_1) {
        return __awaiter(this, arguments, void 0, function* (eventId, userId, rsvp = prisma_1.RSVP.PENDING) {
            // Check if event exists and is not archived
            const event = yield database_1.prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    attendees: true,
                },
            });
            if (!event) {
                throw new errors_1.NotFoundError('Event not found');
            }
            if (event.isArchived) {
                throw new errors_1.ValidationError('Cannot RSVP to archived event');
            }
            // Check capacity
            if (event.capacity) {
                const yesRSVPs = event.attendees.filter(a => a.rsvp === prisma_1.RSVP.YES).length;
                if (rsvp === prisma_1.RSVP.YES && yesRSVPs >= event.capacity) {
                    throw new errors_1.ValidationError('Event is at capacity');
                }
            }
            // Check RSVP deadline
            if (event.rsvpDeadline && new Date() > event.rsvpDeadline) {
                throw new errors_1.ValidationError('RSVP deadline has passed');
            }
            // Create or update attendee record
            const attendee = yield database_1.prisma.attendee.upsert({
                where: {
                    userId_eventId: {
                        userId,
                        eventId,
                    },
                },
                update: {
                    rsvp,
                    responseTime: new Date(),
                },
                create: {
                    userId,
                    eventId,
                    rsvp,
                    responseTime: new Date(),
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            image: true,
                        },
                    },
                    event: {
                        select: {
                            id: true,
                            name: true,
                            date: true,
                            time: true,
                            location: true,
                        },
                    },
                },
            });
            return attendee;
        });
    }
    /**
     * Remove attendee from event
     */
    removeAttendee(eventId, userId, requesterId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if event exists
            const event = yield database_1.prisma.event.findUnique({
                where: { id: eventId },
            });
            if (!event) {
                throw new errors_1.NotFoundError('Event not found');
            }
            // Only allow removal if it's the user themselves or the event host
            if (userId !== requesterId && event.hostId !== requesterId) {
                throw new errors_1.AuthorizationError('You can only remove yourself or be removed by the event host');
            }
            // Don't allow host to remove themselves
            if (event.hostId === userId) {
                throw new errors_1.ValidationError('Event host cannot remove themselves from the event');
            }
            yield database_1.prisma.attendee.delete({
                where: {
                    userId_eventId: {
                        userId,
                        eventId,
                    },
                },
            });
        });
    }
    /**
     * Get attendees for an event
     */
    getEventAttendees(eventId, rsvpFilter) {
        return __awaiter(this, void 0, void 0, function* () {
            const where = { eventId };
            if (rsvpFilter) {
                where.rsvp = rsvpFilter;
            }
            return database_1.prisma.attendee.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            image: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
        });
    }
    /**
     * Check if user can view event based on privacy settings
     */
    canUserViewEvent(event, userId) {
        // Host can always view their own event
        if (event.hostId === userId) {
            return true;
        }
        // Public events can be viewed by anyone
        if (event.privacyLevel === prisma_1.PrivacyLevel.PUBLIC) {
            return true;
        }
        // For private/friends-only events, check if user is invited
        // This would require implementing friend relationships
        // For now, we'll allow viewing if user is an attendee
        return true; // Simplified for now
    }
    /**
     * Get user's events (hosted and attending)
     */
    getUserEvents(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const [hosting, attending] = yield Promise.all([
                // Events user is hosting
                database_1.prisma.event.findMany({
                    where: {
                        hostId: userId,
                        isArchived: false,
                        cancelledAt: null,
                    },
                    include: {
                        host: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                image: true,
                            },
                        },
                        attendees: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        username: true,
                                        image: true,
                                    },
                                },
                            },
                        },
                        _count: {
                            select: {
                                attendees: true,
                                comments: true,
                                photos: true,
                            },
                        },
                    },
                    orderBy: { date: 'asc' },
                }),
                // Events user is attending
                database_1.prisma.event.findMany({
                    where: {
                        attendees: {
                            some: {
                                userId,
                                rsvp: { in: [prisma_1.RSVP.YES, prisma_1.RSVP.MAYBE] },
                            },
                        },
                        isArchived: false,
                        cancelledAt: null,
                    },
                    include: {
                        host: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                image: true,
                            },
                        },
                        attendees: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        username: true,
                                        image: true,
                                    },
                                },
                            },
                        },
                        _count: {
                            select: {
                                attendees: true,
                                comments: true,
                                photos: true,
                            },
                        },
                    },
                    orderBy: { date: 'asc' },
                }),
            ]);
            return { hosting, attending };
        });
    }
}
// Export singleton instance
exports.eventService = new EventService();
