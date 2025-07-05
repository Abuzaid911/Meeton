import { Request, Response, NextFunction } from 'express';
import { sharingService } from '../services/sharingService';
import { ValidationError, AuthenticationError, NotFoundError } from '../utils/errors';

/**
 * Sharing Controller
 * Handles event sharing and invite link HTTP requests
 */
export class SharingController {
  /**
   * Generate invite link for an event
   * POST /api/sharing/events/:eventId/invite-links
   */
  async generateInviteLink(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;
      const userId = (req.user as any)?.id;
      const { expiresIn, maxUses, customMessage } = req.body;

      if (!eventId) {
        throw new ValidationError('Event ID is required');
      }

      if (!userId) {
        throw new AuthenticationError('Authentication required');
      }

      const inviteLink = await sharingService.generateInviteLink(eventId, userId, {
        expiresIn,
        maxUses,
        customMessage,
      });

      res.status(201).json({
        success: true,
        data: {
          ...inviteLink,
          url: `${process.env.APP_BASE_URL || 'https://meeton.app'}/invite/${inviteLink.token}`,
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get invite link by token
   * GET /api/sharing/invite/:token
   */
  async getInviteLink(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;

      if (!token) {
        throw new ValidationError('Token is required');
      }

      const inviteLink = await sharingService.getInviteLinkByToken(token);

      if (!inviteLink) {
        throw new NotFoundError('Invite link not found or expired');
      }

      // Get event details for the invite
      const eventSummary = await sharingService.createEventSummary(inviteLink.eventId);

      res.status(200).json({
        success: true,
        data: {
          inviteLink,
          event: eventSummary,
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Use an invite link (track usage)
   * POST /api/sharing/invite/:token/use
   */
  async useInviteLink(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;
      const userId = (req.user as any)?.id;

      if (!token) {
        throw new ValidationError('Token is required');
      }

      const success = await sharingService.useInviteLink(token, userId);

      if (!success) {
        throw new NotFoundError('Invite link not found or expired');
      }

      res.status(200).json({
        success: true,
        message: 'Invite link used successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all invite links for an event
   * GET /api/sharing/events/:eventId/invite-links
   */
  async getEventInviteLinks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;
      const userId = (req.user as any)?.id;

      if (!eventId) {
        throw new ValidationError('Event ID is required');
      }

      if (!userId) {
        throw new AuthenticationError('Authentication required');
      }

      const inviteLinks = await sharingService.getEventInviteLinks(eventId, userId);

      res.status(200).json({
        success: true,
        data: inviteLinks.map(link => ({
          ...link,
          url: `${process.env.APP_BASE_URL || 'https://meeton.app'}/invite/${link.token}`,
        }))
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deactivate an invite link
   * DELETE /api/sharing/invite-links/:linkId
   */
  async deactivateInviteLink(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { linkId } = req.params;
      const userId = (req.user as any)?.id;

      if (!linkId) {
        throw new ValidationError('Link ID is required');
      }

      if (!userId) {
        throw new AuthenticationError('Authentication required');
      }

      await sharingService.deactivateInviteLink(linkId);

      res.status(200).json({
        success: true,
        message: 'Invite link deactivated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate social media share URL
   * GET /api/sharing/events/:eventId/share/:platform
   */
  async generateShareUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId, platform } = req.params;
      const userId = (req.user as any)?.id;

      if (!eventId || !platform) {
        throw new ValidationError('Event ID and platform are required');
      }

      const shareUrl = await sharingService.generateShareUrl(eventId, platform, userId);

      res.status(200).json({
        success: true,
        data: {
          platform,
          shareUrl,
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get share content for an event
   * GET /api/sharing/events/:eventId/content
   */
  async getShareContent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;
      const { platform } = req.query;

      if (!eventId) {
        throw new ValidationError('Event ID is required');
      }

      const shareContent = await sharingService.generateShareContent(eventId, platform as string);

      res.status(200).json({
        success: true,
        data: shareContent
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available social platforms
   * GET /api/sharing/platforms
   */
  async getSocialPlatforms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const platforms = sharingService.getSocialPlatforms();

      res.status(200).json({
        success: true,
        data: platforms
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate QR code for event
   * GET /api/sharing/events/:eventId/qr-code
   */
  async generateQRCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;

      if (!eventId) {
        throw new ValidationError('Event ID is required');
      }

      const qrCodeUrl = await sharingService.generateEventQRCode(eventId);

      res.status(200).json({
        success: true,
        data: {
          qrCodeUrl,
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get sharing analytics for an event
   * GET /api/sharing/events/:eventId/stats
   */
  async getSharingStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;
      const userId = (req.user as any)?.id;

      if (!eventId) {
        throw new ValidationError('Event ID is required');
      }

      if (!userId) {
        throw new AuthenticationError('Authentication required');
      }

      const stats = await sharingService.getEventSharingStats(eventId);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get event summary for sharing
   * GET /api/sharing/events/:eventId/summary
   */
  async getEventSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;

      if (!eventId) {
        throw new ValidationError('Event ID is required');
      }

      const summary = await sharingService.createEventSummary(eventId);

      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      next(error);
    }
  }
}

export const sharingController = new SharingController(); 