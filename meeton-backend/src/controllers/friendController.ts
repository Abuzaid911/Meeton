import { Request, Response, NextFunction } from 'express';
import { friendService } from '../services/friendService';
import { ValidationError, AuthenticationError, NotFoundError } from '../utils/errors';

/**
 * Friend Controller
 * Handles all friendship-related HTTP requests
 * Following implementation rules for controllers
 */
export class FriendController {
  /**
   * Send friend request
   * POST /api/friends/request
   */
  async sendFriendRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { receiverId } = req.body;
      const senderId = (req.user as any)?.id;

      if (!senderId) {
        throw new AuthenticationError('User not authenticated');
      }

      if (senderId === receiverId) {
        throw new ValidationError('Cannot send friend request to yourself');
      }

      const success = await friendService.sendFriendRequest(senderId, receiverId);

      if (!success) {
        throw new ValidationError('Friend request could not be sent. User may not exist or request already exists.');
      }

      console.log('Friend request sent', { senderId, receiverId });

      res.status(201).json({
        success: true,
        message: 'Friend request sent successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Respond to friend request
   * POST /api/friends/respond
   */
  async respondToFriendRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { requestId, action } = req.body;
      const userId = (req.user as any)?.id;

      if (!userId) {
        throw new AuthenticationError('User not authenticated');
      }

      const success = await friendService.respondToFriendRequest(requestId, userId, action);

      if (!success) {
        throw new NotFoundError('Friend request not found or already processed');
      }

      console.log('Friend request responded', { requestId, action, userId });

      res.status(200).json({
        success: true,
        message: `Friend request ${action.toLowerCase()} successfully`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get friendship status with another user
   * GET /api/friends/status/:userId
   */
  async getFriendshipStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId: otherUserId } = req.params;
      const currentUserId = (req.user as any)?.id;

      if (!currentUserId) {
        throw new AuthenticationError('User not authenticated');
      }

      const status = await friendService.getFriendshipStatus(currentUserId, otherUserId);

      res.status(200).json({
        success: true,
        data: status
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's friends list
   * GET /api/friends
   */
  async getFriends(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.user as any)?.id;
      const { page = 1, limit = 20 } = req.query;

      if (!userId) {
        throw new AuthenticationError('User not authenticated');
      }

      const friends = await friendService.getFriends(
        userId, 
        Number(limit), 
        (Number(page) - 1) * Number(limit)
      );

      res.status(200).json({
        success: true,
        data: friends
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending friend requests
   * GET /api/friends/requests
   */
  async getFriendRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.user as any)?.id;

      if (!userId) {
        throw new AuthenticationError('User not authenticated');
      }

      const requests = await friendService.getFriendRequests(userId);

      res.status(200).json({
        success: true,
        data: requests
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove friend
   * DELETE /api/friends/:userId
   */
  async removeFriend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId: friendUserId } = req.params;
      const currentUserId = (req.user as any)?.id;

      if (!currentUserId) {
        throw new AuthenticationError('User not authenticated');
      }

      const success = await friendService.removeFriend(currentUserId, friendUserId);

      if (!success) {
        throw new NotFoundError('Friendship not found');
      }

      console.log('Friend removed', { currentUserId, friendUserId });

      res.status(200).json({
        success: true,
        message: 'Friend removed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

export const friendController = new FriendController(); 