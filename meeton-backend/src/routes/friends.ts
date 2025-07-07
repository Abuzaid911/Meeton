import { Router, Request, Response } from 'express';
import { friendController } from '../controllers/friendController';
import { authenticate } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimit';

/**
 * Friend Routes
 * Following implementation rules for route organization
 */
const router = Router();

// Apply rate limiting to all friend routes
router.use(apiLimiter);

// All friend routes require authentication
router.use(authenticate);

/**
 * Send friend request
 * POST /api/friends/request
 * Body: { receiverId: string }
 */
router.post('/request', friendController.sendFriendRequest as any);

/**
 * Respond to friend request (accept/decline)
 * POST /api/friends/respond
 * Body: { requestId: string, action: 'ACCEPTED' | 'DECLINED' }
 */
router.post('/respond', friendController.respondToFriendRequest as any);

/**
 * Get friendship status with another user
 * GET /api/friends/status/:userId
 */
router.get('/status/:userId', friendController.getFriendshipStatus as any);

/**
 * Get user's friends list
 * GET /api/friends
 */
router.get('/', friendController.getFriends as any);

/**
 * Get friends for a specific user
 * GET /api/friends/:userId
 */
router.get('/:userId', friendController.getUserFriends as any);

/**
 * Get pending friend requests (sent and received)
 * GET /api/friends/requests
 */
router.get('/requests', friendController.getFriendRequests as any);

/**
 * Cancel sent friend request
 * DELETE /api/friends/request/:userId
 */
router.delete('/request/:userId', friendController.cancelFriendRequest as any);

/**
 * Remove friend
 * DELETE /api/friends/:userId
 */
router.delete('/:userId', friendController.removeFriend as any);

export default router; 