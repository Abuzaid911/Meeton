import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notificationService';
import { prisma } from '../config/database';
import { sendSuccess, sendError } from '../middleware/errorHandler';
import { 
  AuthenticationError, 
  ValidationError,
  NotFoundError 
} from '../utils/errors';

/**
 * Notification Controller - Controllers ONLY handle HTTP concerns
 * Following strict controller pattern from implementation rules
 */
class NotificationController {

  constructor() {
    // Bind methods to preserve context
    this.registerDeviceToken = this.registerDeviceToken.bind(this);
    this.unregisterDeviceToken = this.unregisterDeviceToken.bind(this);
    this.getUserNotifications = this.getUserNotifications.bind(this);
    this.markNotificationAsRead = this.markNotificationAsRead.bind(this);
    this.markAllNotificationsAsRead = this.markAllNotificationsAsRead.bind(this);
    this.deleteNotification = this.deleteNotification.bind(this);
    this.updateNotificationSettings = this.updateNotificationSettings.bind(this);

  }

  /**
   * Register FCM device token for user
   * POST /api/notifications/register-token
   */
  async registerDeviceToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const { token, deviceInfo } = req.body;
      
      if (!token) {
        throw new ValidationError('FCM token is required');
      }

      const success = await NotificationService.registerDeviceToken(
        req.user.id,
        token,
        deviceInfo
      );

      if (success) {
        sendSuccess(res, { registered: true }, 'Device token registered successfully');
      } else {
        throw new Error('Failed to register device token');
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unregister FCM device token
   * POST /api/notifications/unregister-token
   */
  async unregisterDeviceToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const { token } = req.body;
      
      if (!token) {
        throw new ValidationError('FCM token is required');
      }

      const success = await NotificationService.unregisterDeviceToken(
        req.user.id,
        token
      );

      if (success) {
        sendSuccess(res, { unregistered: true }, 'Device token unregistered successfully');
      } else {
        throw new Error('Failed to unregister device token');
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user notifications with pagination
   * GET /api/notifications
   */
  async getUserNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const unreadOnly = req.query.unreadOnly === 'true';
      const offset = (page - 1) * limit;

      const where = {
        targetUserId: req.user.id,
        ...(unreadOnly && { isRead: false }),
      };

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          include: {
            targetUser: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              },
            },
          },
        }),
        prisma.notification.count({ where }),
      ]);

      sendSuccess(res, notifications, 'Notifications retrieved successfully', 200, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark notification as read
   * PATCH /api/notifications/:id/read
   */
  async markNotificationAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const { id } = req.params;

      const notification = await prisma.notification.findFirst({
        where: {
          id,
          targetUserId: req.user.id,
        },
      });

      if (!notification) {
        throw new NotFoundError('Notification not found');
      }

      const updatedNotification = await prisma.notification.update({
        where: { id },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      sendSuccess(res, updatedNotification, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark all notifications as read
   * PATCH /api/notifications/read-all
   */
  async markAllNotificationsAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const result = await prisma.notification.updateMany({
        where: {
          targetUserId: req.user.id,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      sendSuccess(res, { updated: result.count }, `${result.count} notifications marked as read`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete notification
   * DELETE /api/notifications/:id
   */
  async deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const { id } = req.params;

      const notification = await prisma.notification.findFirst({
        where: {
          id,
          targetUserId: req.user.id,
        },
      });

      if (!notification) {
        throw new NotFoundError('Notification not found');
      }

      await prisma.notification.delete({
        where: { id },
      });

      sendSuccess(res, { deleted: true }, 'Notification deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update notification settings
   * PATCH /api/notifications/settings
   */
  async updateNotificationSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const { pushNotifications, emailNotifications, smsNotifications } = req.body;

      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          pushNotifications,
          emailNotifications,
          smsNotifications,
        },
        select: {
          id: true,
          pushNotifications: true,
          emailNotifications: true,
          smsNotifications: true,
        },
      });

      sendSuccess(res, updatedUser, 'Notification settings updated successfully');
    } catch (error) {
      next(error);
    }
  }


}

// Export controller instance
export const notificationController = new NotificationController(); 