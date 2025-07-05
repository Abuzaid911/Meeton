import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analyticsService';
import { AuthenticationError, ValidationError, NotFoundError } from '../utils/errors';

/**
 * Analytics Controller
 * Handles analytics-related HTTP requests
 */
export class AnalyticsController {
  /**
   * Track event view
   * POST /api/analytics/events/:eventId/view
   */
  async trackEventView(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;
      const userId = (req.user as any)?.id;

      if (!eventId) {
        throw new ValidationError('Event ID is required');
      }

      await analyticsService.trackEventView(eventId, userId);

      res.status(200).json({
        success: true,
        message: 'Event view tracked successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Track event share
   * POST /api/analytics/events/:eventId/share
   */
  async trackEventShare(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;
      const { platform } = req.body;
      const userId = (req.user as any)?.id;

      if (!eventId) {
        throw new ValidationError('Event ID is required');
      }

      await analyticsService.trackEventShare(eventId, userId, platform);

      res.status(200).json({
        success: true,
        message: 'Event share tracked successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get event analytics
   * GET /api/analytics/events/:eventId
   */
  async getEventAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;
      const userId = (req.user as any)?.id;

      if (!eventId) {
        throw new ValidationError('Event ID is required');
      }

      if (!userId) {
        throw new AuthenticationError('Authentication required');
      }

      const analytics = await analyticsService.getEventAnalytics(eventId);

      if (!analytics) {
        throw new NotFoundError('Event analytics not found');
      }

      res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get event insights (comprehensive analytics)
   * GET /api/analytics/events/:eventId/insights
   */
  async getEventInsights(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;
      const userId = (req.user as any)?.id;

      if (!eventId) {
        throw new ValidationError('Event ID is required');
      }

      if (!userId) {
        throw new AuthenticationError('Authentication required');
      }

      const insights = await analyticsService.getEventInsights(eventId);

      if (!insights) {
        throw new NotFoundError('Event insights not found');
      }

      res.status(200).json({
        success: true,
        data: insights
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user analytics
   * GET /api/analytics/users/:userId
   */
  async getUserAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const currentUserId = (req.user as any)?.id;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (!currentUserId) {
        throw new AuthenticationError('Authentication required');
      }

      // Users can only view their own analytics
      if (userId !== currentUserId) {
        throw new AuthenticationError('You can only view your own analytics');
      }

      const analytics = await analyticsService.getUserAnalytics(userId);

      if (!analytics) {
        throw new NotFoundError('User analytics not found');
      }

      res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get trending events
   * GET /api/analytics/trending
   */
  async getTrendingEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;

      if (limit > 50) {
        throw new ValidationError('Limit cannot exceed 50');
      }

      const trendingEvents = await analyticsService.getTrendingEvents(limit);

      res.status(200).json({
        success: true,
        data: trendingEvents
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sync event analytics (admin only)
   * POST /api/analytics/events/:eventId/sync
   */
  async syncEventAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;
      const userId = (req.user as any)?.id;

      if (!eventId) {
        throw new ValidationError('Event ID is required');
      }

      if (!userId) {
        throw new AuthenticationError('Authentication required');
      }

      // TODO: Add admin role check when roles are implemented
      // For now, any authenticated user can sync analytics

      await analyticsService.syncEventAnalytics(eventId);

      res.status(200).json({
        success: true,
        message: 'Event analytics synced successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sync all analytics (admin only)
   * POST /api/analytics/sync-all
   */
  async syncAllAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.user as any)?.id;

      if (!userId) {
        throw new AuthenticationError('Authentication required');
      }

      // TODO: Add admin role check when roles are implemented
      // For now, any authenticated user can sync all analytics

      await analyticsService.syncAllEventAnalytics();

      res.status(200).json({
        success: true,
        message: 'All analytics synced successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController(); 