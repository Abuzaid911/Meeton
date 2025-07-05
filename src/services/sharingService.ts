import { APIService } from './api';

export interface InviteLink {
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
  url?: string;
}

export interface ShareContent {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  hashtags?: string[];
}

export interface SocialPlatform {
  name: string;
  shareUrl: string;
  icon: string;
  color: string;
}

export interface SharingStats {
  totalShares: number;
  totalViews: number;
  inviteLinks: {
    total: number;
    active: number;
    totalUses: number;
  };
  platforms: Array<{
    name: string;
    icon: string;
    color: string;
  }>;
}

export interface CreateInviteLinkOptions {
  expiresIn?: number; // hours
  maxUses?: number;
  customMessage?: string;
}

class SharingService {
  /**
   * Generate an invite link for an event
   */
  async generateInviteLink(eventId: string, options: CreateInviteLinkOptions = {}): Promise<InviteLink> {
    const data = await APIService.generateInviteLink(eventId, options);
    if (!data) {
      throw new Error('Failed to generate invite link');
    }
    return data;
  }

  /**
   * Get invite link by token
   */
  async getInviteLink(token: string): Promise<{ inviteLink: InviteLink; event: any }> {
    const data = await APIService.getInviteLink(token);
    if (!data) {
      throw new Error('Failed to get invite link');
    }
    return data;
  }

  /**
   * Use an invite link (track usage)
   */
  async useInviteLink(token: string): Promise<void> {
    const success = await APIService.useInviteLink(token);
    if (!success) {
      throw new Error('Failed to use invite link');
    }
  }

  /**
   * Get all invite links for an event
   */
  async getEventInviteLinks(eventId: string): Promise<InviteLink[]> {
    const data = await APIService.getEventInviteLinks(eventId);
    return data || [];
  }

  /**
   * Deactivate an invite link
   */
  async deactivateInviteLink(linkId: string): Promise<void> {
    const success = await APIService.deactivateInviteLink(linkId);
    if (!success) {
      throw new Error('Failed to deactivate invite link');
    }
  }

  /**
   * Generate share URL for a platform
   */
  async generateShareUrl(eventId: string, platform: string): Promise<string> {
    const shareUrl = await APIService.generateShareUrl(eventId, platform);
    if (!shareUrl) {
      throw new Error('Failed to generate share URL');
    }
    return shareUrl;
  }

  /**
   * Get share content for an event
   */
  async getShareContent(eventId: string, platform?: string): Promise<ShareContent> {
    const data = await APIService.getShareContent(eventId, platform);
    if (!data) {
      throw new Error('Failed to get share content');
    }
    return data;
  }

  /**
   * Get available social platforms
   */
  async getSocialPlatforms(): Promise<SocialPlatform[]> {
    const data = await APIService.getSocialPlatforms();
    return data || [];
  }

  /**
   * Generate QR code for event
   */
  async generateQRCode(eventId: string): Promise<string> {
    const qrCodeUrl = await APIService.generateQRCode(eventId);
    if (!qrCodeUrl) {
      throw new Error('Failed to generate QR code');
    }
    return qrCodeUrl;
  }

  /**
   * Get sharing analytics for an event
   */
  async getSharingStats(eventId: string): Promise<SharingStats> {
    const data = await APIService.getSharingStats(eventId);
    if (!data) {
      throw new Error('Failed to get sharing stats');
    }
    return data;
  }

  /**
   * Get event summary for sharing
   */
  async getEventSummary(eventId: string): Promise<any> {
    const data = await APIService.getEventSummary(eventId);
    if (!data) {
      throw new Error('Failed to get event summary');
    }
    return data;
  }

  /**
   * Share to native platform (iOS/Android)
   */
  async shareToNative(eventId: string): Promise<void> {
    try {
      const shareContent = await this.getShareContent(eventId);
      
      // Use React Native Share API
      const { Share } = await import('react-native');
      
      const shareOptions = {
        title: shareContent.title,
        message: `${shareContent.description}\n\n${shareContent.url}`,
        url: shareContent.url,
      };

      await Share.share(shareOptions);
    } catch (error) {
      console.error('Error sharing to native platform:', error);
      throw error;
    }
  }

  /**
   * Copy share link to clipboard
   */
  async copyShareLink(eventId: string): Promise<string> {
    try {
      const shareContent = await this.getShareContent(eventId);
      
      // Use Expo Clipboard
      const Clipboard = await import('expo-clipboard');
      await Clipboard.setStringAsync(shareContent.url);
      
      return shareContent.url;
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      throw error;
    }
  }

  /**
   * Open share URL in browser/app
   */
  async openShareUrl(shareUrl: string): Promise<void> {
    try {
      const { Linking } = await import('react-native');
      
      const canOpen = await Linking.canOpenURL(shareUrl);
      if (canOpen) {
        await Linking.openURL(shareUrl);
      } else {
        throw new Error('Cannot open URL');
      }
    } catch (error) {
      console.error('Error opening share URL:', error);
      throw error;
    }
  }

  /**
   * Format invite link with custom message
   */
  formatInviteMessage(inviteLink: InviteLink, eventName: string): string {
    const baseMessage = `You're invited to ${eventName}!`;
    const customMessage = inviteLink.customMessage ? `\n\n"${inviteLink.customMessage}"` : '';
    const linkMessage = `\n\nJoin here: ${inviteLink.url}`;
    
    return `${baseMessage}${customMessage}${linkMessage}`;
  }

  /**
   * Get platform icon name for UI
   */
  getPlatformIconName(platform: string): string {
    const iconMap: { [key: string]: string } = {
      facebook: 'logo-facebook',
      twitter: 'logo-twitter',
      linkedin: 'logo-linkedin',
      whatsapp: 'logo-whatsapp',
      telegram: 'paper-plane',
      reddit: 'logo-reddit',
      email: 'mail',
      sms: 'chatbubble',
    };

    return iconMap[platform.toLowerCase()] || 'share';
  }

  /**
   * Validate invite link options
   */
  validateInviteLinkOptions(options: CreateInviteLinkOptions): string[] {
    const errors: string[] = [];

    if (options.expiresIn !== undefined) {
      if (options.expiresIn <= 0) {
        errors.push('Expiration time must be greater than 0 hours');
      }
      if (options.expiresIn > 8760) { // 1 year
        errors.push('Expiration time cannot exceed 1 year');
      }
    }

    if (options.maxUses !== undefined) {
      if (options.maxUses <= 0) {
        errors.push('Maximum uses must be greater than 0');
      }
      if (options.maxUses > 10000) {
        errors.push('Maximum uses cannot exceed 10,000');
      }
    }

    if (options.customMessage && options.customMessage.length > 500) {
      errors.push('Custom message cannot exceed 500 characters');
    }

    return errors;
  }

  /**
   * Format expiration date for display
   */
  formatExpirationDate(expiresAt: Date | null): string {
    if (!expiresAt) {
      return 'Never expires';
    }

    const now = new Date();
    const expiration = new Date(expiresAt);
    
    if (expiration <= now) {
      return 'Expired';
    }

    const diffMs = expiration.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `Expires in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `Expires in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `Expires in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    }
  }

  /**
   * Get usage progress for invite link
   */
  getUsageProgress(inviteLink: InviteLink): { used: number; total: number | null; percentage: number } {
    const used = inviteLink.currentUses;
    const total = inviteLink.maxUses ?? null;
    const percentage = total ? (used / total) * 100 : 0;

    return { used, total, percentage };
  }
}

export const sharingService = new SharingService(); 