import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimit';
import { notificationController } from '../controllers/notificationController';

const router = Router();

/**
 * Notification Routes
 * All routes require authentication
 */

// Apply middleware to all routes
router.use(authenticate);
router.use(apiLimiter);

/**
 * Device Token Management
 */
// Register FCM device token
router.post('/register-token', notificationController.registerDeviceToken);

// Unregister FCM device token
router.post('/unregister-token', notificationController.unregisterDeviceToken);

/**
 * Notification Management
 */
// Get user notifications with pagination
router.get('/', notificationController.getUserNotifications);

// Mark specific notification as read
router.patch('/:id/read', notificationController.markNotificationAsRead);

// Mark all notifications as read
router.patch('/read-all', notificationController.markAllNotificationsAsRead);

// Delete specific notification
router.delete('/:id', notificationController.deleteNotification);

/**
 * Notification Settings
 */
// Update notification preferences
router.patch('/settings', notificationController.updateNotificationSettings);



export default router; 