import { PrismaClient } from '@prisma/client';
import DatabaseManager from '../config/database';
import { analyticsService } from './analyticsService';
import crypto from 'crypto';

/**
 * Sharing Service
 * Handles event sharing, invite links, and social media integration
 */

interface ShareableEvent {
  id: string;
  name: string;
  date: Date;
  time: string;
  location: string;
  description?: string;
  headerImageUrl?: string;
  host: {
    name: string;
    username: string;
  };
}

interface ShareContent {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  hashtags?: string[];
}

interface InviteLink {
  id: string;
  eventId: string;
  token: string;
  createdBy: string;
  expiresAt?: Date | null;
  maxUses?: number | null;
  currentUses: number;
  isActive: boolean;
  customMessage?: string | null;
  createdAt: Date;
}

interface SocialPlatform {
  name: string;
  shareUrl: string;
  icon: string;
  color: string;
}

export class SharingService {
  private prisma: PrismaClient;
  private baseUrl: string;

  constructor() {
    this.prisma = DatabaseManager.getInstance();
    this.baseUrl = process.env.APP_BASE_URL || 'https://meeton.app';
  }

  /**
   * Generate a shareable invite link for an event
   */
  async generateInviteLink(
    eventId: string, 
    createdBy: string, 
    options: {
      expiresIn?: number; // hours
      maxUses?: number;
      customMessage?: string;
    } = {}
  ): Promise<InviteLink> {
    try {
      // Verify event exists and user has permission to share
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          hostId: true,
          privacyLevel: true,
          isArchived: true,
        }
      });

      if (!event) {
        throw new Error('Event not found');
      }

      if (event.isArchived) {
        throw new Error('Cannot share archived event');
      }

      // For private events, only host can create invite links
      if (event.privacyLevel === 'PRIVATE' && event.hostId !== createdBy) {
        throw new Error('Only the host can create invite links for private events');
      }

      // Generate unique token
      const token = this.generateUniqueToken();

      // Calculate expiration date
      const expiresAt = options.expiresIn 
        ? new Date(Date.now() + options.expiresIn * 60 * 60 * 1000)
        : undefined;

      // Create invite link record
      const inviteLink = await this.prisma.inviteLink.create({
        data: {
          eventId,
          token,
          createdBy,
          expiresAt,
          maxUses: options.maxUses,
          customMessage: options.customMessage,
        }
      });

      return {
        id: inviteLink.id,
        eventId: inviteLink.eventId,
        token: inviteLink.token,
        createdBy: inviteLink.createdBy,
        expiresAt: inviteLink.expiresAt,
        maxUses: inviteLink.maxUses,
        currentUses: inviteLink.currentUses,
        isActive: inviteLink.isActive,
        customMessage: inviteLink.customMessage,
        createdAt: inviteLink.createdAt,
      };
    } catch (error) {
      console.error('Error generating invite link:', error);
      throw error;
    }
  }

  /**
   * Get invite link by token
   */
  async getInviteLinkByToken(token: string): Promise<InviteLink | null> {
    try {
      const link = await this.prisma.inviteLink.findUnique({
        where: { 
          token,
        },
      });

      if (!link || !link.isActive) {
        return null;
      }
      
      // Check if link is expired
      if (link.expiresAt && new Date() > link.expiresAt) {
        await this.deactivateInviteLink(link.id);
        return null;
      }

      // Check if max uses reached
      if (link.maxUses && link.currentUses >= link.maxUses) {
        await this.deactivateInviteLink(link.id);
        return null;
      }

      return {
        id: link.id,
        eventId: link.eventId,
        token: link.token,
        createdBy: link.createdBy,
        expiresAt: link.expiresAt,
        maxUses: link.maxUses,
        currentUses: link.currentUses,
        isActive: link.isActive,
        customMessage: link.customMessage,
        createdAt: link.createdAt,
      };
    } catch (error) {
      console.error('Error getting invite link:', error);
      return null;
    }
  }

  /**
   * Use an invite link (increment usage count)
   */
  async useInviteLink(token: string, userId?: string): Promise<boolean> {
    try {
      const link = await this.getInviteLinkByToken(token);
      
      if (!link) {
        return false;
      }

      // Increment usage count
      await this.prisma.inviteLink.update({
        where: { id: link.id },
        data: {
          currentUses: { increment: 1 },
        }
      });

      // Track analytics
      if (userId) {
        analyticsService.trackEventView(link.eventId, userId).catch(console.error);
      }

      return true;
    } catch (error) {
      console.error('Error using invite link:', error);
      return false;
    }
  }

  /**
   * Deactivate an invite link
   */
  async deactivateInviteLink(linkId: string): Promise<void> {
    try {
      await this.prisma.inviteLink.update({
        where: { id: linkId },
        data: { isActive: false }
      });
    } catch (error) {
      console.error('Error deactivating invite link:', error);
    }
  }

  /**
   * Get all invite links for an event
   */
  async getEventInviteLinks(eventId: string, createdBy?: string): Promise<InviteLink[]> {
    try {
      const whereClause: any = { eventId };
      
      if (createdBy) {
        whereClause.createdBy = createdBy;
      }

      const links = await this.prisma.inviteLink.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' }
      });

      return links.map(link => ({
        id: link.id,
        eventId: link.eventId,
        token: link.token,
        createdBy: link.createdBy,
        expiresAt: link.expiresAt,
        maxUses: link.maxUses,
        currentUses: link.currentUses,
        isActive: link.isActive,
        customMessage: link.customMessage,
        createdAt: link.createdAt,
      }));
    } catch (error) {
      console.error('Error getting event invite links:', error);
      return [];
    }
  }

  /**
   * Generate share content for an event
   */
  async generateShareContent(eventId: string, platform?: string): Promise<ShareContent> {
    try {
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        include: {
          host: {
            select: {
              name: true,
              username: true,
            }
          }
        }
      });

      if (!event) {
        throw new Error('Event not found');
      }

      const eventDate = new Date(event.date);
      const formattedDate = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const eventUrl = `${this.baseUrl}/events/${eventId}`;
      
      // Generate platform-specific content
      const baseTitle = `${event.name}`;
      const baseDescription = `Join us for ${event.name} on ${formattedDate} at ${event.time} in ${event.location}. Hosted by ${event.host.name}.`;

      let title = baseTitle;
      let description = baseDescription;
      let hashtags = ['#MeetOn', '#Event'];

      // Add category-specific hashtags
      if (event.category) {
        hashtags.push(`#${event.category.replace(/\s+/g, '')}`);
      }

      // Platform-specific optimizations
      switch (platform?.toLowerCase()) {
        case 'twitter':
          // Twitter has character limits
          const twitterLimit = 280 - eventUrl.length - hashtags.join(' ').length - 10; // buffer
          if (description.length > twitterLimit) {
            description = description.substring(0, twitterLimit - 3) + '...';
          }
          break;
        
        case 'facebook':
          // Facebook prefers longer descriptions
          if (event.description) {
            description += `\n\n${event.description}`;
          }
          break;
        
        case 'linkedin':
          // LinkedIn is professional
          description = `Professional networking event: ${baseDescription}`;
          hashtags.push('#Networking', '#Professional');
          break;
        
        case 'instagram':
          // Instagram is visual
          hashtags.push('#InstaEvent', '#Community');
          break;
      }

      return {
        title,
        description,
        url: eventUrl,
        imageUrl: event.headerImageUrl || undefined,
        hashtags,
      };
    } catch (error) {
      console.error('Error generating share content:', error);
      throw error;
    }
  }

  /**
   * Get social media platform configurations
   */
  getSocialPlatforms(): SocialPlatform[] {
    return [
      {
        name: 'Facebook',
        shareUrl: 'https://www.facebook.com/sharer/sharer.php',
        icon: 'facebook',
        color: '#1877F2'
      },
      {
        name: 'Twitter',
        shareUrl: 'https://twitter.com/intent/tweet',
        icon: 'twitter',
        color: '#1DA1F2'
      },
      {
        name: 'LinkedIn',
        shareUrl: 'https://www.linkedin.com/sharing/share-offsite/',
        icon: 'linkedin',
        color: '#0A66C2'
      },
      {
        name: 'WhatsApp',
        shareUrl: 'https://wa.me/',
        icon: 'whatsapp',
        color: '#25D366'
      },
      {
        name: 'Telegram',
        shareUrl: 'https://t.me/share/url',
        icon: 'telegram',
        color: '#0088CC'
      },
      {
        name: 'Reddit',
        shareUrl: 'https://reddit.com/submit',
        icon: 'reddit',
        color: '#FF4500'
      },
      {
        name: 'Email',
        shareUrl: 'mailto:',
        icon: 'email',
        color: '#EA4335'
      },
      {
        name: 'SMS',
        shareUrl: 'sms:',
        icon: 'sms',
        color: '#34C759'
      }
    ];
  }

  /**
   * Generate platform-specific share URL
   */
  async generateShareUrl(eventId: string, platform: string, userId?: string): Promise<string> {
    try {
      const shareContent = await this.generateShareContent(eventId, platform);
      const platforms = this.getSocialPlatforms();
      const platformConfig = platforms.find(p => p.name.toLowerCase() === platform.toLowerCase());

      if (!platformConfig) {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      // Track the share attempt
      if (userId) {
        analyticsService.trackEventShare(eventId, userId, platform).catch(console.error);
      }

      let shareUrl = '';
      const encodedUrl = encodeURIComponent(shareContent.url);
      const encodedTitle = encodeURIComponent(shareContent.title);
      const encodedDescription = encodeURIComponent(shareContent.description);
      const encodedHashtags = shareContent.hashtags ? encodeURIComponent(shareContent.hashtags.join(' ')) : '';

      switch (platform.toLowerCase()) {
        case 'facebook':
          shareUrl = `${platformConfig.shareUrl}?u=${encodedUrl}`;
          break;

        case 'twitter':
          const twitterText = `${shareContent.title} ${shareContent.description} ${encodedHashtags}`;
          shareUrl = `${platformConfig.shareUrl}?text=${encodeURIComponent(twitterText)}&url=${encodedUrl}`;
          break;

        case 'linkedin':
          shareUrl = `${platformConfig.shareUrl}?url=${encodedUrl}&title=${encodedTitle}&summary=${encodedDescription}`;
          break;

        case 'whatsapp':
          const whatsappText = `${shareContent.title}\n\n${shareContent.description}\n\n${shareContent.url}`;
          shareUrl = `${platformConfig.shareUrl}?text=${encodeURIComponent(whatsappText)}`;
          break;

        case 'telegram':
          const telegramText = `${shareContent.title}\n\n${shareContent.description}`;
          shareUrl = `${platformConfig.shareUrl}?url=${encodedUrl}&text=${encodeURIComponent(telegramText)}`;
          break;

        case 'reddit':
          shareUrl = `${platformConfig.shareUrl}?url=${encodedUrl}&title=${encodedTitle}`;
          break;

        case 'email':
          const emailSubject = encodeURIComponent(`Invitation: ${shareContent.title}`);
          const emailBody = encodeURIComponent(`${shareContent.description}\n\nEvent Details: ${shareContent.url}`);
          shareUrl = `${platformConfig.shareUrl}?subject=${emailSubject}&body=${emailBody}`;
          break;

        case 'sms':
          const smsText = `${shareContent.title}\n\n${shareContent.description}\n\n${shareContent.url}`;
          shareUrl = `${platformConfig.shareUrl}?body=${encodeURIComponent(smsText)}`;
          break;

        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      return shareUrl;
    } catch (error) {
      console.error('Error generating share URL:', error);
      throw error;
    }
  }

  /**
   * Generate a QR code for event sharing
   */
  async generateEventQRCode(eventId: string): Promise<string> {
    try {
      const eventUrl = `${this.baseUrl}/events/${eventId}`;
      
      // For now, return a QR code service URL
      // In production, you might want to use a library like 'qrcode' to generate QR codes
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(eventUrl)}`;
      
      return qrCodeUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  /**
   * Get sharing analytics for an event
   */
  async getEventSharingStats(eventId: string): Promise<any> {
    try {
      // Get analytics data
      const analytics = await analyticsService.getEventAnalytics(eventId);
      
      // Get invite links stats
      const inviteLinks = await this.getEventInviteLinks(eventId);
      const totalInviteUses = inviteLinks.reduce((sum, link) => sum + link.currentUses, 0);
      const activeInviteLinks = inviteLinks.filter(link => link.isActive).length;

      return {
        totalShares: analytics?.shareCount || 0,
        totalViews: analytics?.viewCount || 0,
        inviteLinks: {
          total: inviteLinks.length,
          active: activeInviteLinks,
          totalUses: totalInviteUses,
        },
        platforms: this.getSocialPlatforms().map(platform => ({
          name: platform.name,
          icon: platform.icon,
          color: platform.color,
        })),
      };
    } catch (error) {
      console.error('Error getting sharing stats:', error);
      return {
        totalShares: 0,
        totalViews: 0,
        inviteLinks: { total: 0, active: 0, totalUses: 0 },
        platforms: [],
      };
    }
  }

  /**
   * Create shareable event summary
   */
  async createEventSummary(eventId: string): Promise<any> {
    try {
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        include: {
          host: {
            select: {
              name: true,
              username: true,
              image: true,
            }
          },
          _count: {
            select: {
              attendees: true,
            }
          }
        }
      });

      if (!event) {
        throw new Error('Event not found');
      }

      const eventDate = new Date(event.date);
      const isUpcoming = eventDate > new Date();

      return {
        id: event.id,
        name: event.name,
        description: event.description,
        date: event.date,
        time: event.time,
        location: event.location,
        host: event.host,
        attendeeCount: event._count.attendees,
        headerImageUrl: event.headerImageUrl,
        category: event.category,
        tags: event.tags,
        isUpcoming,
        shareUrl: `${this.baseUrl}/events/${eventId}`,
      };
    } catch (error) {
      console.error('Error creating event summary:', error);
      throw error;
    }
  }

  /**
   * Generate unique token for invite links
   */
  private generateUniqueToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Clean up expired invite links
   */
  async cleanupExpiredInviteLinks(): Promise<void> {
    try {
      await this.prisma.inviteLink.updateMany({
        where: {
          expiresAt: { lt: new Date() },
          isActive: true,
        },
        data: {
          isActive: false,
        }
      });
      
      console.log('Cleaned up expired invite links');
    } catch (error) {
      console.error('Error cleaning up expired invite links:', error);
    }
  }
}

export const sharingService = new SharingService(); 