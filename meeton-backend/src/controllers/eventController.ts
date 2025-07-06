import { Request, Response, NextFunction } from 'express';
import { eventService } from '../services/eventService';
import { analyticsService } from '../services/analyticsService';
import { sendSuccess, sendError } from '../middleware/errorHandler';
import { 
  AuthenticationError, 
  ValidationError,
  NotFoundError,
  AuthorizationError 
} from '../utils/errors';
import { createEventSchema } from '../utils/validation';
import { RSVP } from '@prisma/client';
import { prisma } from '../config/database';

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
    this.uploadEventPhoto = this.uploadEventPhoto.bind(this);
    this.getEventPhotos = this.getEventPhotos.bind(this);
  }

  /**
   * Create a new event
   * POST /api/events
   */
  async createEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const validatedData = createEventSchema.parse(req.body);
      
      const event = await eventService.createEvent(req.user.id, validatedData);
      
      sendSuccess(res, event, 'Event created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get events with filtering and pagination
   * GET /api/events
   */
  async getEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        page = '1',
        limit = '20',
        category,
        privacy,
        search,
        hostId,
        attendeeId,
        startDate,
        endDate,
        sortBy = 'date',
        sortOrder = 'asc',
      } = req.query;

      const options = {
        page: parseInt(page as string, 10),
        limit: Math.min(parseInt(limit as string, 10), 100), // Max 100 events per page
        category: category as string,
        privacyLevel: privacy as any,
        search: search as string,
        hostId: hostId as string,
        attendeeId: attendeeId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
      };

      const result = await eventService.getEvents(options);
      
      sendSuccess(res, result.events, 'Events retrieved successfully', 200, {
        page: result.page,
        limit: options.limit,
        total: result.total,
        totalPages: result.totalPages,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get event by ID
   * GET /api/events/:id
   */
  async getEventById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const event = await eventService.getEventById(id, userId);
      
      if (!event) {
        throw new NotFoundError('Event not found');
      }

      // Track event view (async, don't wait for completion)
      analyticsService.trackEventView(id, userId).catch(error => {
        console.error('Failed to track event view:', error);
      });
      
      sendSuccess(res, event, 'Event retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update an event
   * PUT /api/events/:id
   */
  async updateEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const { id } = req.params;
      
      // Note: Using partial validation for updates
      const updateData = req.body;
      
      const event = await eventService.updateEvent(id, req.user.id, updateData);
      
      sendSuccess(res, event, 'Event updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete/Archive an event
   * DELETE /api/events/:id
   */
  async deleteEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const { id } = req.params;
      
      await eventService.deleteEvent(id, req.user.id);
      
      sendSuccess(res, null, 'Event deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * RSVP to an event
   * POST /api/events/:id/rsvp
   */
  async rsvpToEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const { id } = req.params;
      const { rsvp } = req.body;
      
      // Validate RSVP value
      if (!Object.values(RSVP).includes(rsvp)) {
        throw new ValidationError('Invalid RSVP value. Must be YES, NO, MAYBE, or PENDING');
      }
      
      const attendee = await eventService.addAttendee(id, req.user.id, rsvp);

      // Track RSVP analytics (async, don't wait for completion)
      if (rsvp !== 'PENDING') {
        analyticsService.trackRSVP(id, rsvp).catch(error => {
          console.error('Failed to track RSVP:', error);
        });
      }
      
      sendSuccess(res, attendee, 'RSVP updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove attendee from event
   * DELETE /api/events/:id/attendees/:userId
   */
  async removeAttendee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const { id, userId } = req.params;
      
      await eventService.removeAttendee(id, userId, req.user.id);
      
      sendSuccess(res, null, 'Attendee removed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get event attendees
   * GET /api/events/:id/attendees
   */
  async getEventAttendees(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { rsvp } = req.query;
      
      // Validate RSVP filter if provided
      let rsvpFilter;
      if (rsvp && Object.values(RSVP).includes(rsvp as RSVP)) {
        rsvpFilter = rsvp as RSVP;
      }
      
      const attendees = await eventService.getEventAttendees(id, rsvpFilter);
      
      sendSuccess(res, attendees, 'Event attendees retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's events (hosted and attending)
   * GET /api/events/user/:userId
   */
  async getUserEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const { userId } = req.params;
      
      // Users can only view their own events unless it's public data
      // For now, allow viewing any user's events (can be restricted later)
      
      const events = await eventService.getUserEvents(userId);
      
      sendSuccess(res, events, 'User events retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload a photo to an event
   * POST /api/events/:id/photos
   */
  async uploadEventPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AuthenticationError('Authentication required');
      const { id: eventId } = req.params;
      const { caption } = req.body;
      
      if (!req.file) throw new ValidationError('Image upload failed');
      
      // Only allow users who RSVP'd YES
      const isAttending = await eventService.isUserAttendingEvent(eventId, req.user.id);
      if (!isAttending) throw new AuthorizationError('Only going users can upload photos');
      
      // Create photo record with Cloudinary URL
      const photo = await prisma.eventPhoto.create({
        data: {
          eventId,
          userId: req.user.id,
          imageUrl: req.file.path, // Cloudinary URL from multer-storage-cloudinary
          caption: caption || null,
          storageKey: req.file.filename // Cloudinary public ID
        },
        include: {
          user: { select: { id: true, name: true, username: true, image: true } },
        },
      });
      
      sendSuccess(res, {
        id: photo.id,
        imageUrl: photo.imageUrl,
        caption: photo.caption || undefined,
        uploadedAt: photo.uploadedAt,
        user: photo.user
      }, 'Photo uploaded successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all photos for an event
   * GET /api/events/:id/photos
   */
  async getEventPhotos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: eventId } = req.params;
      const photos = await eventService.getEventPhotos(eventId);
      sendSuccess(res, photos, 'Event photos retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

// Export controller instance
export const eventController = new EventController(); 