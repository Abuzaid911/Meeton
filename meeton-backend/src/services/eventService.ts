import { Event, Attendee, RSVP, PrivacyLevel } from '@prisma/client';
import { prisma } from '../config/database';
import { 
  ValidationError, 
  NotFoundError, 
  AuthorizationError, 
  ConflictError 
} from '../utils/errors';
import { locationService } from './locationService';
import { weatherService } from './weatherService';
import { cacheService, CachedEvent } from './cacheService';

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

      // Process location data if coordinates are not provided
      let lat = data.lat;
      let lng = data.lng;
      let locationDetails = null;

      if (!lat || !lng) {
        // Attempt to geocode the location
        const geocodeResult = await locationService.geocodeAddress(data.location);
        if (geocodeResult) {
          lat = geocodeResult.coordinates.lat;
          lng = geocodeResult.coordinates.lng;
          locationDetails = geocodeResult;
        }
      }

      // Create the event
      const event = await prisma.event.create({
        data: {
          name: data.name,
          date: eventDate,
          time: data.time,
          location: data.location,
          lat: lat,
          lng: lng,
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
          locationDetails: locationDetails as any,
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

      // Fetch weather data asynchronously (don't wait for completion)
      if (lat && lng) {
        weatherService.getEventWeather(event.id).catch(error => {
          console.error(`Failed to fetch weather for event ${event.id}:`, error);
        });
      }

      // Cache the newly created event
      await cacheService.cacheEvent(event as unknown as CachedEvent);

      // Invalidate related caches
      await cacheService.invalidateUserCache(hostId);

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
    console.log('🔍 [BACKEND EVENT] getEventById called for:', eventId, 'by user:', userId);
    
    // Try to get from cache first
    const cachedEvent = await cacheService.getCachedEvent(eventId);
    if (cachedEvent) {
      console.log('💾 [BACKEND EVENT] Found cached event with', (cachedEvent as any)?.attendees?.length || 0, 'attendees');
      
      // Check privacy permissions
      if (userId && !(await this.canUserViewEvent(cachedEvent, userId))) {
        throw new AuthorizationError('You do not have permission to view this event');
      }

      // Increment view count if not the host viewing their own event
      if (userId && userId !== cachedEvent.hostId) {
        await prisma.event.update({
          where: { id: eventId },
          data: { viewCount: { increment: 1 } },
        });
        
        // Invalidate cache to reflect updated view count
        await cacheService.invalidateEventCache(eventId);
      }

      return cachedEvent;
    }

    // If not in cache, fetch from database
    console.log('🗄️ [BACKEND EVENT] No cache found, fetching from database...');
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
      console.log('❌ [BACKEND EVENT] Event not found in database');
      return null;
    }
    
    console.log('✅ [BACKEND EVENT] Database returned event with', event.attendees?.length || 0, 'attendees');

    // Check privacy permissions
    if (userId && !(await this.canUserViewEvent(event, userId))) {
      throw new AuthorizationError('You do not have permission to view this event');
    }

    // Cache the event
    await cacheService.cacheEvent(event as CachedEvent);

    // Increment view count if not the host viewing their own event
    if (userId && userId !== event.hostId) {
      await prisma.event.update({
        where: { id: eventId },
        data: { viewCount: { increment: 1 } },
      });
      
      // Invalidate cache to reflect updated view count
      await cacheService.invalidateEventCache(eventId);
    }

    return event;
  }

  /**
   * Get events with filtering and pagination
   */
  async getEvents(options: EventQueryOptions = {}, userId?: string): Promise<{
    events: Event[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    console.log('🔍 [BACKEND SERVICE] getEvents called with userId:', userId);
    console.log('🔍 [BACKEND SERVICE] Options:', options);

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

    console.log('🔍 [BACKEND SERVICE] Initial where clause:', where);

    if (category) {
      where.category = category;
    }

    if (privacyLevel) {
      where.privacyLevel = privacyLevel;
    } else if (userId) {
      // If user is provided, filter by privacy level
      // For authenticated users, show PUBLIC, FRIENDS_ONLY (if friends), and PRIVATE (if invited)
      console.log('🔍 [BACKEND SERVICE] User provided, building privacy filter for userId:', userId);
      
      where.OR = [
        { privacyLevel: PrivacyLevel.PUBLIC },
        { hostId: userId }, // Always show user's own events
        {
          // FRIENDS_ONLY events where user is friends with host
          privacyLevel: PrivacyLevel.FRIENDS_ONLY,
          host: {
            OR: [
              {
                sentFriendRequests: {
                  some: {
                    receiverId: userId,
                    status: 'ACCEPTED'
                  }
                }
              },
              {
                receivedFriendRequests: {
                  some: {
                    senderId: userId,
                    status: 'ACCEPTED'
                  }
                }
              }
            ]
          }
        },
        {
          // PRIVATE events where user is invited (attendee)
          privacyLevel: PrivacyLevel.PRIVATE,
          attendees: {
            some: {
              userId: userId
            }
          }
        }
      ];
      
      console.log('🔍 [BACKEND SERVICE] Privacy filter OR conditions:', where.OR);
    } else {
      // For unauthenticated users, only show public events
      console.log('🔍 [BACKEND SERVICE] No user provided, showing only public events');
      where.privacyLevel = PrivacyLevel.PUBLIC;
    }

    if (search) {
      // Apply search to the existing OR clause or create a new one
      const searchClause = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
        ]
      };
      
      if (where.OR) {
        // Combine privacy filtering with search
        where.AND = [
          { OR: where.OR },
          searchClause
        ];
        delete where.OR;
        console.log('🔍 [BACKEND SERVICE] Combined privacy + search, final where.AND:', where.AND);
      } else {
        where.OR = searchClause.OR;
        console.log('🔍 [BACKEND SERVICE] Search only, where.OR:', where.OR);
      }
    }

    if (hostId) {
      where.hostId = hostId;
      console.log('🔍 [BACKEND SERVICE] Added hostId filter:', hostId);
    }

    if (attendeeId) {
      where.attendees = {
        some: {
          userId: attendeeId,
          rsvp: { in: [RSVP.YES, RSVP.MAYBE] },
        },
      };
      console.log('🔍 [BACKEND SERVICE] Added attendeeId filter:', attendeeId);
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = startDate;
      }
      if (endDate) {
        where.date.lte = endDate;
      }
      console.log('🔍 [BACKEND SERVICE] Added date filter:', where.date);
    }

    console.log('🔍 [BACKEND SERVICE] Final WHERE clause:', JSON.stringify(where, null, 2));

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

    console.log('🔍 [BACKEND SERVICE] Query results:', {
      totalFound: total,
      eventsReturned: events.length,
      eventDetails: events.map(e => ({
        id: e.id,
        name: e.name,
        hostId: e.hostId,
        privacyLevel: e.privacyLevel,
        isUserHost: e.hostId === userId
      }))
    });

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

    // Handle location updates
    if (data.location && data.location !== existingEvent.location) {
      // If coordinates are not provided, try to geocode the new location
      if (!data.lat || !data.lng) {
        const geocodeResult = await locationService.geocodeAddress(data.location);
        if (geocodeResult) {
          updateData.lat = geocodeResult.coordinates.lat;
          updateData.lng = geocodeResult.coordinates.lng;
          updateData.locationDetails = geocodeResult as any;
        }
      } else {
        updateData.lat = data.lat;
        updateData.lng = data.lng;
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

    // Refresh weather data if location or date changed
    if ((data.location || data.date) && updatedEvent.lat && updatedEvent.lng) {
      weatherService.getEventWeather(eventId).catch(error => {
        console.error(`Failed to refresh weather for event ${eventId}:`, error);
      });
    }

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

    // Invalidate cache to ensure fresh data on next fetch
    await cacheService.invalidateEventCache(eventId);
    console.log('🔄 [BACKEND RSVP] Cache invalidated for event:', eventId);

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
  private async canUserViewEvent(event: Event, userId: string): Promise<boolean> {
    // Host can always view their own event
    if (event.hostId === userId) {
      return true;
    }

    // Public events can be viewed by anyone
    if (event.privacyLevel === PrivacyLevel.PUBLIC) {
      return true;
    }

    // For friends-only events, check if user is friends with host
    if (event.privacyLevel === PrivacyLevel.FRIENDS_ONLY) {
      const friendship = await prisma.friendRequest.findFirst({
        where: {
          OR: [
            { senderId: event.hostId, receiverId: userId, status: 'ACCEPTED' },
            { senderId: userId, receiverId: event.hostId, status: 'ACCEPTED' }
          ]
        }
      });
      
      if (!friendship) {
        return false;
      }
    }

    // For private events, only invited users (attendees) can view
    if (event.privacyLevel === PrivacyLevel.PRIVATE) {
      const attendee = await prisma.attendee.findUnique({
        where: {
          userId_eventId: {
            userId,
            eventId: event.id
          }
        }
      });
      
      return !!attendee;
    }

    return true;
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