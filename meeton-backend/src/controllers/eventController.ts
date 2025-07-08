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
import { NotificationService } from '../services/notificationService';

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
    this.inviteUsersToEvent = this.inviteUsersToEvent.bind(this);
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
      console.log('🔍 [BACKEND] getEvents controller called');
      console.log('🔍 [BACKEND] Request user:', req.user ? { id: req.user.id, email: req.user.email } : 'No user');
      console.log('🔍 [BACKEND] Query params:', req.query);

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
        sortBy: sortBy as 'date' | 'created' | 'name' | 'popularity',
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      console.log('🔍 [BACKEND] Processed options:', options);

      const result = await eventService.getEvents(options, req.user?.id);
      
      console.log('🔍 [BACKEND] Events service returned:', {
        total: result.total,
        eventCount: result.events.length,
        userRequestedId: req.user?.id,
        eventsWithHostIds: result.events.map(e => ({ id: e.id, hostId: e.hostId, privacy: e.privacyLevel })),
        userIsHostOfCount: result.events.filter(e => e.hostId === req.user?.id).length
      });

      sendSuccess(res, result, 'Events retrieved successfully');
    } catch (error) {
      console.error('🔍 [BACKEND] getEvents error:', error);
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
      
      console.log('🚀 [BACKEND RSVP] RSVP request received:', { eventId: id, userId: req.user.id, rsvp });
      
      // Validate RSVP value
      if (!Object.values(RSVP).includes(rsvp)) {
        throw new ValidationError('Invalid RSVP value. Must be YES, NO, MAYBE, or PENDING');
      }
      
      const attendee = await eventService.addAttendee(id, req.user.id, rsvp);
      console.log('✅ [BACKEND RSVP] Attendee created/updated:', { attendeeId: attendee.id, rsvp: attendee.rsvp });

      // Track RSVP analytics (async, don't wait for completion)
      if (rsvp !== 'PENDING') {
        analyticsService.trackRSVP(id, rsvp).catch(error => {
          console.error('Failed to track RSVP:', error);
        });
      }
      
      // Send RSVP notification to event host (async, don't wait for completion)
      if (rsvp !== 'PENDING') {
        const event = await eventService.getEventById(id);
        if (event && event.hostId !== req.user.id) {
          // Don't notify the host if they're RSVPing to their own event
          NotificationService.sendRSVPNotification(
            event.hostId,
            req.user.name || req.user.username,
            rsvp,
            event.name,
            id
          ).catch(error => {
            console.error('Failed to send RSVP notification:', error);
          });
          console.log(`📲 [RSVP NOTIFICATION] Sent ${rsvp} notification to host ${event.hostId} for event ${event.name}`);
        }
      }
      
      // Return updated event data with all attendees for frontend consistency
      console.log('📡 [BACKEND RSVP] Fetching updated event data...');
      const updatedEvent = await eventService.getEventById(id, req.user.id);
      console.log('📡 [BACKEND RSVP] Updated event has', (updatedEvent as any)?.attendees?.length || 0, 'attendees');
      
      const userAttendeeInUpdated = (updatedEvent as any)?.attendees?.find((a: any) => a.user.id === req.user!.id);
      console.log('👤 [BACKEND RSVP] User in updated event:', userAttendeeInUpdated ? { id: userAttendeeInUpdated.id, rsvp: userAttendeeInUpdated.rsvp } : 'Not found');
      
      sendSuccess(res, { attendee, event: updatedEvent }, 'RSVP updated successfully');
    } catch (error) {
      console.error('❌ [BACKEND RSVP] Error:', error);
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

  /**
   * Invite users to an event
   * POST /api/events/:id/invite
   */
  async inviteUsersToEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const { id: eventId } = req.params;
      const { userIds, customMessage } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new ValidationError('User IDs array is required and cannot be empty');
      }

      // Validate event exists and user has permission to invite
      const event = await eventService.getEventById(eventId, req.user.id);
      if (!event) {
        throw new NotFoundError('Event not found');
      }

      // Only host or attendees can invite others (depending on privacy level)
      const isHost = event.hostId === req.user.id;
      const isAttendee = (event as any).attendees?.some((a: any) => 
        a.user.id === req.user?.id && (a.rsvp === 'YES' || a.rsvp === 'MAYBE')
      );
      
      if (!isHost && !isAttendee) {
        throw new AuthorizationError('Only event host or attendees can invite others');
      }

      // For private events, only host can invite
      if (event.privacyLevel === 'PRIVATE' && !isHost) {
        throw new AuthorizationError('Only the host can invite users to private events');
      }

      // Send notifications to invited users
      const invitationPromises = userIds.map(async (userId: string) => {
        try {
          await NotificationService.sendEventInvitationNotification(
            userId,
            event.name,
            req.user!.name || req.user!.username,
            eventId
          );
          return { userId, success: true };
        } catch (error) {
          console.error(`Failed to send invitation to user ${userId}:`, error);
          return { 
            userId, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });

      const results = await Promise.all(invitationPromises);
      const successful = results.filter(r => r.success).length;
      const failed = results.length - successful;

      sendSuccess(res, {
        invitationsSent: successful,
        invitationsFailed: failed,
        results: results
      }, `${successful} invitation(s) sent successfully${failed > 0 ? `, ${failed} failed` : ''}`);
    } catch (error) {
      next(error);
    }
  }
}

// Export controller instance
export const eventController = new EventController(); 