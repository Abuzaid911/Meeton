import { Router } from 'express';
import { friendController } from '../controllers/friendController';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { apiLimiter } from '../middleware/rateLimit';
import { sendFriendRequestSchema, respondToFriendRequestSchema } from '../utils/validation';

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
router.post(
  '/request',
  validateBody(sendFriendRequestSchema),
  friendController.sendFriendRequest
);

/**
 * Respond to friend request (accept/decline)
 * POST /api/friends/respond
 * Body: { requestId: string, action: 'ACCEPTED' | 'DECLINED' }
 */
router.post(
  '/respond',
  validateBody(respondToFriendRequestSchema),
  friendController.respondToFriendRequest
);

/**
 * Get friendship status with another user
 * GET /api/friends/status/:userId
 */
router.get(
  '/status/:userId',
  friendController.getFriendshipStatus
);

/**
 * Get user's friends list
 * GET /api/friends
 */
router.get('/', friendController.getFriends);

/**
 * Get pending friend requests (sent and received)
 * GET /api/friends/requests
 */
router.get('/requests', friendController.getFriendRequests);

/**
 * Remove friend
 * DELETE /api/friends/:userId
 */
router.delete('/:userId', friendController.removeFriend);

export default router; 