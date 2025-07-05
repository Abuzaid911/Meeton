import { PrismaClient } from '@prisma/client';
import DatabaseManager from '../config/database';

/**
 * Analytics Service
 * Handles all analytics tracking and reporting
 */
export class AnalyticsService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = DatabaseManager.getInstance();
  }

  /**
   * Track event view
   */
  async trackEventView(eventId: string, userId?: string): Promise<void> {
    try {
      // Update event view count
      await this.prisma.event.update({
        where: { id: eventId },
        data: { viewCount: { increment: 1 } }
      });

      // Update or create event analytics
      await this.prisma.eventAnalytics.upsert({
        where: { eventId },
        create: {
          eventId,
          viewCount: 1,
        },
        update: {
          viewCount: { increment: 1 },
        }
      });

      console.log(`Event view tracked: ${eventId}, user: ${userId || 'anonymous'}`);
    } catch (error) {
      console.error('Error tracking event view:', error);
    }
  }

  /**
   * Track event share
   */
  async trackEventShare(eventId: string, userId?: string, platform?: string): Promise<void> {
    try {
      // Update event share count
      await this.prisma.event.update({
        where: { id: eventId },
        data: { shareCount: { increment: 1 } }
      });

      // Update or create event analytics
      await this.prisma.eventAnalytics.upsert({
        where: { eventId },
        create: {
          eventId,
          shareCount: 1,
        },
        update: {
          shareCount: { increment: 1 },
        }
      });

      console.log(`Event share tracked: ${eventId}, platform: ${platform}, user: ${userId || 'anonymous'}`);
    } catch (error) {
      console.error('Error tracking event share:', error);
    }
  }

  /**
   * Track RSVP response
   */
  async trackRSVP(eventId: string, rsvp: 'YES' | 'MAYBE' | 'NO'): Promise<void> {
    try {
      const updateData: any = {};
      
      switch (rsvp) {
        case 'YES':
          updateData.rsvpYesCount = { increment: 1 };
          break;
        case 'MAYBE':
          updateData.rsvpMaybeCount = { increment: 1 };
          break;
        case 'NO':
          updateData.rsvpNoCount = { increment: 1 };
          break;
      }

      await this.prisma.eventAnalytics.upsert({
        where: { eventId },
        create: {
          eventId,
          ...Object.fromEntries(
            Object.entries(updateData).map(([key, value]) => [key, (value as any).increment])
          ),
        },
        update: updateData,
      });

      console.log(`RSVP tracked: ${eventId}, response: ${rsvp}`);
    } catch (error) {
      console.error('Error tracking RSVP:', error);
    }
  }

  /**
   * Track event check-in
   */
  async trackCheckin(eventId: string): Promise<void> {
    try {
      await this.prisma.eventAnalytics.upsert({
        where: { eventId },
        create: {
          eventId,
          checkinCount: 1,
        },
        update: {
          checkinCount: { increment: 1 },
        }
      });

      console.log(`Check-in tracked: ${eventId}`);
    } catch (error) {
      console.error('Error tracking check-in:', error);
    }
  }

  /**
   * Track comment on event
   */
  async trackComment(eventId: string): Promise<void> {
    try {
      await this.prisma.eventAnalytics.upsert({
        where: { eventId },
        create: {
          eventId,
          commentCount: 1,
        },
        update: {
          commentCount: { increment: 1 },
        }
      });

      console.log(`Comment tracked: ${eventId}`);
    } catch (error) {
      console.error('Error tracking comment:', error);
    }
  }

  /**
   * Track photo upload to event
   */
  async trackPhotoUpload(eventId: string): Promise<void> {
    try {
      await this.prisma.eventAnalytics.upsert({
        where: { eventId },
        create: {
          eventId,
          photoCount: 1,
        },
        update: {
          photoCount: { increment: 1 },
        }
      });

      console.log(`Photo upload tracked: ${eventId}`);
    } catch (error) {
      console.error('Error tracking photo upload:', error);
    }
  }

  /**
   * Get event analytics
   */
  async getEventAnalytics(eventId: string): Promise<any> {
    try {
      const analytics = await this.prisma.eventAnalytics.findUnique({
        where: { eventId }
      });

      if (!analytics) {
        // Create initial analytics record
        return await this.prisma.eventAnalytics.create({
          data: { eventId }
        });
      }

      return analytics;
    } catch (error) {
      console.error('Error getting event analytics:', error);
      return null;
    }
  }

  /**
   * Get comprehensive event analytics with engagement metrics
   */
  async getEventInsights(eventId: string): Promise<any> {
    try {
      const [analytics, event, attendeesData] = await Promise.all([
        this.getEventAnalytics(eventId),
        this.prisma.event.findUnique({
          where: { id: eventId },
          select: {
            viewCount: true,
            shareCount: true,
            createdAt: true,
            capacity: true,
          }
        }),
        this.prisma.attendee.groupBy({
          by: ['rsvp'],
          where: { eventId },
          _count: { rsvp: true }
        })
      ]);

      if (!analytics || !event) {
        return null;
      }

      // Calculate engagement metrics
      const totalRSVPs = attendeesData.reduce((sum, group) => sum + group._count.rsvp, 0);
      const yesRSVPs = attendeesData.find(g => g.rsvp === 'YES')?._count.rsvp || 0;
      const maybeRSVPs = attendeesData.find(g => g.rsvp === 'MAYBE')?._count.rsvp || 0;
      const noRSVPs = attendeesData.find(g => g.rsvp === 'NO')?._count.rsvp || 0;

      const engagementRate = event.viewCount > 0 ? (totalRSVPs / event.viewCount) * 100 : 0;
      const conversionRate = totalRSVPs > 0 ? (yesRSVPs / totalRSVPs) * 100 : 0;
      const capacityUtilization = event.capacity ? (yesRSVPs / event.capacity) * 100 : null;

      return {
        ...analytics,
        insights: {
          totalViews: event.viewCount,
          totalShares: event.shareCount,
          totalRSVPs,
          rsvpBreakdown: {
            yes: yesRSVPs,
            maybe: maybeRSVPs,
            no: noRSVPs,
          },
          metrics: {
            engagementRate: Math.round(engagementRate * 100) / 100,
            conversionRate: Math.round(conversionRate * 100) / 100,
            capacityUtilization: capacityUtilization ? Math.round(capacityUtilization * 100) / 100 : null,
          },
          trends: {
            viewsPerDay: this.calculateDailyViews(event.createdAt, event.viewCount),
            sharesPerDay: this.calculateDailyShares(event.createdAt, event.shareCount),
          }
        }
      };
    } catch (error) {
      console.error('Error getting event insights:', error);
      return null;
    }
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(userId: string): Promise<any> {
    try {
      const [analytics, hostedEvents, attendedEvents, friendsCount] = await Promise.all([
        this.prisma.userAnalytics.findUnique({ where: { userId } }),
        this.prisma.event.count({ where: { hostId: userId } }),
        this.prisma.attendee.count({ 
          where: { 
            userId, 
            rsvp: { in: ['YES', 'MAYBE'] } 
          } 
        }),
        this.prisma.friendRequest.count({
          where: {
            OR: [
              { senderId: userId, status: 'ACCEPTED' },
              { receiverId: userId, status: 'ACCEPTED' }
            ]
          }
        })
      ]);

      // Update or create user analytics
      const updatedAnalytics = await this.prisma.userAnalytics.upsert({
        where: { userId },
        create: {
          userId,
          eventsHosted: hostedEvents,
          eventsAttended: attendedEvents,
          friendsCount,
        },
        update: {
          eventsHosted: hostedEvents,
          eventsAttended: attendedEvents,
          friendsCount,
        }
      });

      return updatedAnalytics;
    } catch (error) {
      console.error('Error getting user analytics:', error);
      return null;
    }
  }

  /**
   * Get trending events based on engagement
   */
  async getTrendingEvents(limit: number = 10): Promise<any[]> {
    try {
      const events = await this.prisma.event.findMany({
        where: {
          isArchived: false,
          date: { gte: new Date() } // Only future events
        },
        include: {
          host: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            }
          },
          _count: {
            select: {
              attendees: true,
              comments: true,
              photos: true,
            }
          }
        },
        orderBy: [
          { viewCount: 'desc' },
          { shareCount: 'desc' },
          { createdAt: 'desc' }
        ],
        take: limit
      });

      return events.map(event => ({
        ...event,
        engagementScore: this.calculateEngagementScore(event),
      }));
    } catch (error) {
      console.error('Error getting trending events:', error);
      return [];
    }
  }

  /**
   * Calculate engagement score for ranking
   */
  private calculateEngagementScore(event: any): number {
    const weights = {
      view: 1,
      share: 5,
      rsvp: 10,
      comment: 15,
      photo: 20,
    };

    const score = 
      (event.viewCount * weights.view) +
      (event.shareCount * weights.share) +
      (event._count.attendees * weights.rsvp) +
      (event._count.comments * weights.comment) +
      (event._count.photos * weights.photo);

    return score;
  }

  /**
   * Calculate daily views average
   */
  private calculateDailyViews(createdAt: Date, totalViews: number): number {
    const daysSinceCreation = Math.max(1, Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
    return Math.round((totalViews / daysSinceCreation) * 100) / 100;
  }

  /**
   * Calculate daily shares average
   */
  private calculateDailyShares(createdAt: Date, totalShares: number): number {
    const daysSinceCreation = Math.max(1, Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
    return Math.round((totalShares / daysSinceCreation) * 100) / 100;
  }

  /**
   * Sync analytics for all events (maintenance function)
   */
  async syncAllEventAnalytics(): Promise<void> {
    try {
      const events = await this.prisma.event.findMany({
        select: { id: true }
      });

      for (const event of events) {
        await this.syncEventAnalytics(event.id);
      }

      console.log(`Synced analytics for ${events.length} events`);
    } catch (error) {
      console.error('Error syncing all event analytics:', error);
    }
  }

  /**
   * Sync analytics for a specific event
   */
  async syncEventAnalytics(eventId: string): Promise<void> {
    try {
      const [attendeesData, commentCount, photoCount] = await Promise.all([
        this.prisma.attendee.groupBy({
          by: ['rsvp'],
          where: { eventId },
          _count: { rsvp: true }
        }),
        this.prisma.comment.count({ where: { eventId } }),
        this.prisma.eventPhoto.count({ where: { eventId } })
      ]);

      const yesCount = attendeesData.find(g => g.rsvp === 'YES')?._count.rsvp || 0;
      const maybeCount = attendeesData.find(g => g.rsvp === 'MAYBE')?._count.rsvp || 0;
      const noCount = attendeesData.find(g => g.rsvp === 'NO')?._count.rsvp || 0;
      const checkinCount = await this.prisma.attendee.count({
        where: { eventId, checkedIn: true }
      });

      await this.prisma.eventAnalytics.upsert({
        where: { eventId },
        create: {
          eventId,
          rsvpYesCount: yesCount,
          rsvpMaybeCount: maybeCount,
          rsvpNoCount: noCount,
          checkinCount,
          commentCount,
          photoCount,
        },
        update: {
          rsvpYesCount: yesCount,
          rsvpMaybeCount: maybeCount,
          rsvpNoCount: noCount,
          checkinCount,
          commentCount,
          photoCount,
        }
      });
    } catch (error) {
      console.error(`Error syncing analytics for event ${eventId}:`, error);
    }
  }
}

export const analyticsService = new AnalyticsService(); 