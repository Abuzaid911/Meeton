import * as admin from 'firebase-admin';
import { prisma } from '../config/database';
import FirebaseManager from '../config/firebase';
import { NotificationSourceType } from '@prisma/client';

/**
 * Notification Service - Handles push notifications via Firebase
 * Following implementation rules for service layer pattern
 */

interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  actionUrl?: string;
}

interface NotificationRecipient {
  userId: string;
  fcmToken?: string;
}

export class NotificationService {
  
  /**
   * Send push notification to a single user
   */
  static async sendNotificationToUser(
    userId: string, 
    notification: PushNotificationData,
    sourceType: NotificationSourceType,
    sourceId?: string
  ): Promise<boolean> {
    try {
      // Get user's FCM token from database
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, pushNotifications: true }
      });

      if (!user || !user.pushNotifications) {
        console.log(`User ${userId} has push notifications disabled`);
        return false;
      }

      // Get user's device tokens (we'll add this to user model later)
      const deviceTokens = await this.getUserDeviceTokens(userId);
      
      if (deviceTokens.length === 0) {
        console.log(`No device tokens found for user ${userId}`);
        return false;
      }

      // Send notification via Firebase
      const success = await this.sendFirebaseNotification(deviceTokens, notification);
      
      if (success) {
        // Store notification in database
        await this.createNotificationRecord(
          userId,
          notification.title,
          notification.body,
          sourceType,
          sourceId,
          notification.actionUrl
        );
      }

      return success;
    } catch (error) {
      console.error('Error sending notification to user:', error);
      return false;
    }
  }

  /**
   * Send push notification to multiple users
   */
  static async sendNotificationToUsers(
    userIds: string[],
    notification: PushNotificationData,
    sourceType: NotificationSourceType,
    sourceId?: string
  ): Promise<{ successful: number; failed: number }> {
    let successful = 0;
    let failed = 0;

    // Send notifications in batches to avoid overwhelming Firebase
    const BATCH_SIZE = 500;
    
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);
      
      const promises = batch.map(async (userId) => {
        const success = await this.sendNotificationToUser(userId, notification, sourceType, sourceId);
        return success;
      });

      const results = await Promise.allSettled(promises);
      
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          successful++;
        } else {
          failed++;
        }
      });
    }

    console.log(`Notification batch sent: ${successful} successful, ${failed} failed`);
    return { successful, failed };
  }

  /**
   * Send Firebase push notification
   */
  private static async sendFirebaseNotification(
    tokens: string[],
    notification: PushNotificationData
  ): Promise<boolean> {
    try {
      const messaging = FirebaseManager.getMessaging();
      
      if (!messaging) {
        console.log('Firebase messaging not initialized');
        return false;
      }

      // Prepare the message
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
        },
        data: {
          ...notification.data,
          actionUrl: notification.actionUrl || '',
          timestamp: Date.now().toString(),
        },
        android: {
          notification: {
            channelId: 'meeton_notifications',
            priority: 'high' as const,
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await messaging.sendEachForMulticast(message);
      
      // Handle failed tokens (remove invalid ones)
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp: any, idx: number) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
            console.error(`Failed to send to token ${tokens[idx]}:`, resp.error);
          }
        });
        
        // Remove invalid tokens from database
        await this.removeInvalidTokens(failedTokens);
      }

      console.log(`Firebase notification sent: ${response.successCount} successful, ${response.failureCount} failed`);
      return response.successCount > 0;
    } catch (error) {
      console.error('Error sending Firebase notification:', error);
      return false;
    }
  }

  /**
   * Store notification record in database
   */
  private static async createNotificationRecord(
    userId: string,
    title: string,
    body: string,
    sourceType: NotificationSourceType,
    sourceId?: string,
    actionUrl?: string
  ): Promise<void> {
    try {
      await prisma.notification.create({
        data: {
          targetUserId: userId,
          message: `${title}: ${body}`,
          link: actionUrl,
          sourceType,
          // Map sourceId to appropriate fields based on sourceType
          ...(sourceType === 'FRIEND_REQUEST' && sourceId && { friendRequestId: sourceId }),
          ...(sourceType === 'ATTENDEE' && sourceId && { attendeeId: sourceId }),
        },
      });
    } catch (error) {
      console.error('Error creating notification record:', error);
    }
  }

  /**
   * Get user device tokens (FCM tokens)
   * Note: We'll need to add a DeviceToken model to store these
   */
  private static async getUserDeviceTokens(userId: string): Promise<string[]> {
    try {
      // For now, return empty array - we'll implement device token storage later
      // In a real implementation, you'd have a DeviceToken model:
      // const deviceTokens = await prisma.deviceToken.findMany({
      //   where: { userId, isActive: true },
      //   select: { token: true }
      // });
      // return deviceTokens.map(dt => dt.token);
      
      return [];
    } catch (error) {
      console.error('Error getting user device tokens:', error);
      return [];
    }
  }

  /**
   * Remove invalid FCM tokens from database
   */
  private static async removeInvalidTokens(tokens: string[]): Promise<void> {
    try {
      // For now, just log - we'll implement when we have device token storage
      console.log('Removing invalid tokens:', tokens);
      
      // In a real implementation:
      // await prisma.deviceToken.updateMany({
      //   where: { token: { in: tokens } },
      //   data: { isActive: false }
      // });
    } catch (error) {
      console.error('Error removing invalid tokens:', error);
    }
  }

  /**
   * Register a new device token for a user
   */
  static async registerDeviceToken(userId: string, token: string, deviceInfo?: any): Promise<boolean> {
    try {
      // For now, just log - we'll implement device token storage later
      console.log(`Registering device token for user ${userId}:`, token);
      
      // In a real implementation:
      // await prisma.deviceToken.upsert({
      //   where: { 
      //     userId_token: { userId, token }
      //   },
      //   create: {
      //     userId,
      //     token,
      //     deviceInfo,
      //     isActive: true,
      //   },
      //   update: {
      //     isActive: true,
      //     deviceInfo,
      //   }
      // });
      
      return true;
    } catch (error) {
      console.error('Error registering device token:', error);
      return false;
    }
  }

  /**
   * Unregister a device token
   */
  static async unregisterDeviceToken(userId: string, token: string): Promise<boolean> {
    try {
      console.log(`Unregistering device token for user ${userId}:`, token);
      
      // In a real implementation:
      // await prisma.deviceToken.updateMany({
      //   where: { userId, token },
      //   data: { isActive: false }
      // });
      
      return true;
    } catch (error) {
      console.error('Error unregistering device token:', error);
      return false;
    }
  }

  /**
   * Send notification for friend request
   */
  static async sendFriendRequestNotification(
    receiverId: string,
    senderName: string,
    requestId: string
  ): Promise<boolean> {
    return this.sendNotificationToUser(
      receiverId,
      {
        title: 'New Friend Request',
        body: `${senderName} wants to be your friend`,
        data: {
          type: 'friend_request',
          requestId,
        },
        actionUrl: `/friends/requests`,
      },
      'FRIEND_REQUEST',
      requestId
    );
  }

  /**
   * Send notification for event invitation
   */
  static async sendEventInvitationNotification(
    userId: string,
    eventName: string,
    hostName: string,
    eventId: string
  ): Promise<boolean> {
    return this.sendNotificationToUser(
      userId,
      {
        title: 'Event Invitation',
        body: `${hostName} invited you to ${eventName}`,
        data: {
          type: 'event_invitation',
          eventId,
        },
        actionUrl: `/events/${eventId}`,
      },
      'PRIVATE_INVITATION'
    );
  }

  /**
   * Send notification for event update
   */
  static async sendEventUpdateNotification(
    attendeeIds: string[],
    eventName: string,
    updateMessage: string,
    eventId: string
  ): Promise<{ successful: number; failed: number }> {
    return this.sendNotificationToUsers(
      attendeeIds,
      {
        title: 'Event Update',
        body: `${eventName}: ${updateMessage}`,
        data: {
          type: 'event_update',
          eventId,
        },
        actionUrl: `/events/${eventId}`,
      },
      'EVENT_UPDATE'
    );
  }
}

export default NotificationService; 