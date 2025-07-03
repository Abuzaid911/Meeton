import { Event, Attendee, RSVP, PrivacyLevel } from '../generated/prisma';
import { prisma } from '../config/database';
import { 
  ValidationError, 
  NotFoundError, 
  AuthorizationError, 
  ConflictError 
} from '../utils/errors';

/**
 * Event creation input interface
 */
export interface CreateEventInput {
  name: string;
  date: string | Date;
  time: string;
  location: string;
  lat?: number;
  lng?: number;
  description?: string;
  duration: number;
  capacity?: number;
  rsvpDeadline?: string | Date;
  headerType?: 'color' | 'image';
  headerColor?: string;
  headerImageUrl?: string;
  category?: string;
  tags?: string[];
  privacyLevel: PrivacyLevel;
  ticketPrice?: number;
  externalUrl?: string;
}

/**
 * Event update input interface
 */
export interface UpdateEventInput {
  name?: string;
  date?: string | Date;
  time?: string;
  location?: string;
  lat?: number;
  lng?: number;
  description?: string;
  duration?: number;
  capacity?: number;
  rsvpDeadline?: string | Date;
  headerType?: 'color' | 'image';
  headerColor?: string;
  headerImageUrl?: string;
  category?: string;
  tags?: string[];
  privacyLevel?: PrivacyLevel;
  ticketPrice?: number;
  externalUrl?: string;
}

/**
 * Event filtering and pagination options
 */
export interface EventQueryOptions {
  page?: number;
  limit?: number;
  category?: string;
  privacyLevel?: PrivacyLevel;
  search?: string;
  hostId?: string;
  attendeeId?: string;
  startDate?: Date;
  endDate?: Date;
  sortBy?: 'date' | 'created' | 'name' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Event Service - ALL event business logic MUST be in this service layer
 * Handles event creation, updates, deletion, queries, and attendee management
 */
class EventService {

  /**
   * Create a new event
   */
  async createEvent(hostId: string, data: CreateEventInput): Promise<Event> {
    try {
      // Convert date strings to Date objects if needed
      const eventDate = typeof data.date === 'string' ? new Date(data.date) : data.date;
      const rsvpDeadline = data.rsvpDeadline 
        ? (typeof data.rsvpDeadline === 'string' ? new Date(data.rsvpDeadline) : data.rsvpDeadline)
        : undefined;

      // Validate that the event date is in the future
      if (eventDate <= new Date()) {
        throw new ValidationError('Event date must be in the future');
      }

      // Validate RSVP deadline if provided
      if (rsvpDeadline && rsvpDeadline >= eventDate) {
        throw new ValidationError('RSVP deadline must be before the event date');
      }

      // Create the event
      const event = await prisma.event.create({
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
      await this.addAttendee(event.id, hostId, RSVP.YES);

      return event;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      console.error('Error creating event:', error);
      throw new ValidationError('Failed to create event');
    }
  }

  /**
   * Get event by ID with full details
   */
  async getEventById(eventId: string, userId?: string): Promise<Event | null> {
    const event = await prisma.event.findUnique({
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
      throw new AuthorizationError('You do not have permission to view this event');
    }

    // Increment view count if not the host viewing their own event
    if (userId && userId !== event.hostId) {
      await prisma.event.update({
        where: { id: eventId },
        data: { viewCount: { increment: 1 } },
      });
    }

    return event;
  }

  /**
   * Get events with filtering and pagination
   */
  async getEvents(options: EventQueryOptions = {}): Promise<{
    events: Event[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 20,
      category,
      privacyLevel,
      search,
      hostId,
      attendeeId,
      startDate,
      endDate,
      sortBy = 'date',
      sortOrder = 'asc',
    } = options;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
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
          rsvp: { in: [RSVP.YES, RSVP.MAYBE] },
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
    let orderBy: any;
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
    const [events, total] = await Promise.all([
      prisma.event.findMany({
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
      prisma.event.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      events,
      total,
      page,
      totalPages,
    };
  }

  /**
   * Update an event
   */
  async updateEvent(eventId: string, hostId: string, data: UpdateEventInput): Promise<Event> {
    // Verify the user owns this event
    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!existingEvent) {
      throw new NotFoundError('Event not found');
    }

    if (existingEvent.hostId !== hostId) {
      throw new AuthorizationError('Only the event host can update this event');
    }

    // Prepare update data
    const updateData: any = { ...data };

    // Convert dates if provided
    if (data.date) {
      updateData.date = typeof data.date === 'string' ? new Date(data.date) : data.date;
      
      // Validate future date
      if (updateData.date <= new Date()) {
        throw new ValidationError('Event date must be in the future');
      }
    }

    if (data.rsvpDeadline) {
      updateData.rsvpDeadline = typeof data.rsvpDeadline === 'string' 
        ? new Date(data.rsvpDeadline) 
        : data.rsvpDeadline;
      
      // Validate RSVP deadline
      const eventDate = updateData.date || existingEvent.date;
      if (updateData.rsvpDeadline >= eventDate) {
        throw new ValidationError('RSVP deadline must be before the event date');
      }
    }

    const updatedEvent = await prisma.event.update({
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
  }

  /**
   * Delete/Archive an event
   */
  async deleteEvent(eventId: string, hostId: string): Promise<void> {
    // Verify the user owns this event
    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!existingEvent) {
      throw new NotFoundError('Event not found');
    }

    if (existingEvent.hostId !== hostId) {
      throw new AuthorizationError('Only the event host can delete this event');
    }

    // Soft delete by archiving
    await prisma.event.update({
      where: { id: eventId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });
  }

  /**
   * Add attendee to event (RSVP)
   */
  async addAttendee(eventId: string, userId: string, rsvp: RSVP = RSVP.PENDING): Promise<Attendee> {
    // Check if event exists and is not archived
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        attendees: true,
      },
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    if (event.isArchived) {
      throw new ValidationError('Cannot RSVP to archived event');
    }

    // Check capacity
    if (event.capacity) {
      const yesRSVPs = event.attendees.filter((a: Attendee) => a.rsvp === RSVP.YES).length;
      if (rsvp === RSVP.YES && yesRSVPs >= event.capacity) {
        throw new ValidationError('Event is at capacity');
      }
    }

    // Check RSVP deadline
    if (event.rsvpDeadline && new Date() > event.rsvpDeadline) {
      throw new ValidationError('RSVP deadline has passed');
    }

    // Create or update attendee record
    const attendee = await prisma.attendee.upsert({
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
  }

  /**
   * Remove attendee from event
   */
  async removeAttendee(eventId: string, userId: string, requesterId: string): Promise<void> {
    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    // Only allow removal if it's the user themselves or the event host
    if (userId !== requesterId && event.hostId !== requesterId) {
      throw new AuthorizationError('You can only remove yourself or be removed by the event host');
    }

    // Don't allow host to remove themselves
    if (event.hostId === userId) {
      throw new ValidationError('Event host cannot remove themselves from the event');
    }

    await prisma.attendee.delete({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    });
  }

  /**
   * Get attendees for an event
   */
  async getEventAttendees(eventId: string, rsvpFilter?: RSVP): Promise<Attendee[]> {
    const where: any = { eventId };
    
    if (rsvpFilter) {
      where.rsvp = rsvpFilter;
    }

    return prisma.attendee.findMany({
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
  }

  /**
   * Check if user can view event based on privacy settings
   */
  private canUserViewEvent(event: Event, userId: string): boolean {
    // Host can always view their own event
    if (event.hostId === userId) {
      return true;
    }

    // Public events can be viewed by anyone
    if (event.privacyLevel === PrivacyLevel.PUBLIC) {
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
  async getUserEvents(userId: string): Promise<{
    hosting: Event[];
    attending: Event[];
  }> {
    const [hosting, attending] = await Promise.all([
      // Events user is hosting
      prisma.event.findMany({
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
      prisma.event.findMany({
        where: {
          attendees: {
            some: {
              userId,
              rsvp: { in: [RSVP.YES, RSVP.MAYBE] },
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
  }

  /**
   * Check if a user is attending (RSVP YES) an event
   */
  async isUserAttendingEvent(eventId: string, userId: string): Promise<boolean> {
    const attendee = await prisma.attendee.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });
    return attendee?.rsvp === RSVP.YES;
  }

  /**
   * Add a photo to an event
   */
  async addEventPhoto(eventId: string, userId: string, imageUrl: string, caption?: string) {
    // Validate event and user
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundError('Event not found');
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');
    // Create photo
    return prisma.eventPhoto.create({
      data: {
        eventId,
        userId,
        imageUrl,
        caption,
      },
      include: {
        user: { select: { id: true, name: true, username: true, image: true } },
      },
    });
  }

  /**
   * Get all photos for an event
   */
  async getEventPhotos(eventId: string) {
    return prisma.eventPhoto.findMany({
      where: { eventId },
      orderBy: { uploadedAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, username: true, image: true } },
      },
    });
  }
}

// Export singleton instance
export const eventService = new EventService(); 