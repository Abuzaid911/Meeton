import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendError } from '../middleware/errorHandler';
import { 
  AuthenticationError, 
  ValidationError,
  NotFoundError 
} from '../utils/errors';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    username: string;
  };
}

/**
 * Friend Controller - Handle friend-related operations
 * Following strict controller pattern from implementation rules
 */
class FriendController {

  constructor() {
    // Bind methods to preserve context
    this.sendFriendRequest = this.sendFriendRequest.bind(this);
    this.respondToFriendRequest = this.respondToFriendRequest.bind(this);
    this.getFriends = this.getFriends.bind(this);
    this.getUserFriends = this.getUserFriends.bind(this);
    this.getFriendRequests = this.getFriendRequests.bind(this);
    this.getSuggestedFriends = this.getSuggestedFriends.bind(this);
    this.getFriendshipStatus = this.getFriendshipStatus.bind(this);
    this.removeFriend = this.removeFriend.bind(this);
    this.cancelFriendRequest = this.cancelFriendRequest.bind(this);
  }

  /**
   * Send friend request
   * POST /api/friends/request
   */
  async sendFriendRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const { receiverId } = req.body;
      const senderId = req.user.id;

      if (senderId === receiverId) {
        throw new ValidationError('Cannot send friend request to yourself');
      }

      // Check if target user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: receiverId }
      });

      if (!targetUser) {
        throw new NotFoundError('User not found');
      }

      // Check if friendship already exists
      const existingFriendship = await prisma.friendRequest.findFirst({
        where: {
          OR: [
            { senderId, receiverId },
            { senderId: receiverId, receiverId: senderId }
          ]
        }
      });

      if (existingFriendship) {
        throw new ValidationError('Friendship request already exists or users are already friends');
      }

      // Create friend request
      const friendRequest = await prisma.friendRequest.create({
        data: {
          senderId,
          receiverId,
          status: 'PENDING'
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true
            }
          },
          receiver: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true
            }
          }
        }
      });

      sendSuccess(res, friendRequest, 'Friend request sent successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Respond to friend request (accept/decline)
   * POST /api/friends/respond
   */
  async respondToFriendRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const { requestId, action } = req.body; // 'ACCEPTED' or 'DECLINED'

      if (!['ACCEPTED', 'DECLINED'].includes(action)) {
        throw new ValidationError('Invalid action. Must be ACCEPTED or DECLINED');
      }

      // Find the friend request
      const friendRequest = await prisma.friendRequest.findUnique({
        where: { id: requestId },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true
            }
          },
          receiver: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true
            }
          }
        }
      });

      if (!friendRequest) {
        throw new NotFoundError('Friend request not found');
      }

      // Verify the current user is the receiver
      if (friendRequest.receiverId !== req.user.id) {
        throw new AuthenticationError('You can only respond to friend requests sent to you');
      }

      if (friendRequest.status !== 'PENDING') {
        throw new ValidationError('Friend request has already been responded to');
      }

      // Update the friend request status
      const updatedRequest = await prisma.friendRequest.update({
        where: { id: requestId },
        data: { status: action },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true
            }
          },
          receiver: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true
            }
          }
        }
      });

      sendSuccess(res, updatedRequest, `Friend request ${action.toLowerCase()} successfully`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's friends
   * GET /api/friends
   */
  async getFriends(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const friends = await prisma.friendRequest.findMany({
        where: {
          OR: [
            { senderId: req.user.id, status: 'ACCEPTED' },
            { receiverId: req.user.id, status: 'ACCEPTED' }
          ]
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
              bio: true,
              location: true
            }
          },
          receiver: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
              bio: true,
              location: true
            }
          }
        }
      });

      // Map to get the friend (not the current user)
      const friendsList = friends.map((friendship: any) => {
        return friendship.senderId === req.user!.id ? friendship.receiver : friendship.sender;
      });

      sendSuccess(res, friendsList, 'Friends retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get friends for a specific user
   * GET /api/friends/:userId
   */
  async getUserFriends(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const { userId } = req.params;

      // Check if the target user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true }
      });

      if (!targetUser) {
        throw new NotFoundError('User not found');
      }

      // Get friends of the target user
      const friends = await prisma.friendRequest.findMany({
        where: {
          OR: [
            { senderId: userId, status: 'ACCEPTED' },
            { receiverId: userId, status: 'ACCEPTED' }
          ]
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
              bio: true,
              location: true
            }
          },
          receiver: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
              bio: true,
              location: true
            }
          }
        }
      });

      // Map to get the friend (not the target user)
      const friendsList = friends.map((friendship: any) => {
        return friendship.senderId === userId ? friendship.receiver : friendship.sender;
      });

      sendSuccess(res, friendsList, 'User friends retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get friend requests (sent and received)
   * GET /api/friends/requests
   */
  async getFriendRequests(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const [sentRequests, receivedRequests] = await Promise.all([
        // Requests sent by the user
        prisma.friendRequest.findMany({
          where: {
            senderId: req.user.id,
            status: 'PENDING'
          },
          include: {
            receiver: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
                bio: true,
                location: true
              }
            }
          }
        }),
        // Requests received by the user
        prisma.friendRequest.findMany({
          where: {
            receiverId: req.user.id,
            status: 'PENDING'
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
                bio: true,
                location: true
              }
            }
          }
        })
      ]);

      sendSuccess(res, {
        sent: sentRequests.map((req: any) => ({ ...req, user: req.receiver })),
        received: receivedRequests.map((req: any) => ({ ...req, user: req.sender }))
      }, 'Friend requests retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get suggested friends
   * GET /api/friends/suggestions
   */
  async getSuggestedFriends(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      // Get users who are not already friends and not in pending requests
      const existingConnections = await prisma.friendRequest.findMany({
        where: {
          OR: [
            { senderId: req.user.id },
            { receiverId: req.user.id }
          ]
        },
        select: {
          senderId: true,
          receiverId: true
        }
      });

      const excludeIds = [
        req.user.id,
        ...existingConnections.map((conn: any) => 
          conn.senderId === req.user!.id ? conn.receiverId : conn.senderId
        )
      ];

      const suggestions = await prisma.user.findMany({
        where: {
          id: { notIn: excludeIds }
        },
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          bio: true,
          location: true
        },
        take: 10 // Limit suggestions
      });

      sendSuccess(res, suggestions, 'Friend suggestions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get friendship status with another user
   * GET /api/friends/status/:userId
   */
  async getFriendshipStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const { userId } = req.params;

      if (req.user.id === userId) {
        sendSuccess(res, { status: 'SELF' }, 'Cannot have friendship with yourself');
        return;
      }

      const friendship = await prisma.friendRequest.findFirst({
        where: {
          OR: [
            { senderId: req.user.id, receiverId: userId },
            { senderId: userId, receiverId: req.user.id }
          ]
        }
      });

      if (!friendship) {
        sendSuccess(res, { status: 'NONE' }, 'No friendship exists');
        return;
      }

      let status: string;
      if (friendship.status === 'ACCEPTED') {
        status = 'FRIENDS';
      } else if (friendship.status === 'PENDING') {
        if (friendship.senderId === req.user.id) {
          status = 'PENDING_SENT';
        } else {
          status = 'PENDING_RECEIVED';
        }
      } else {
        status = 'NONE';
      }

      sendSuccess(res, { 
        status, 
        requestId: friendship.status === 'PENDING' ? friendship.id : undefined 
      }, 'Friendship status retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove friend
   * DELETE /api/friends/:userId
   */
  async removeFriend(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const { userId } = req.params;

      const friendship = await prisma.friendRequest.findFirst({
        where: {
          OR: [
            { senderId: req.user.id, receiverId: userId, status: 'ACCEPTED' },
            { senderId: userId, receiverId: req.user.id, status: 'ACCEPTED' }
          ]
        }
      });

      if (!friendship) {
        throw new NotFoundError('Friendship not found');
      }

      await prisma.friendRequest.delete({
        where: { id: friendship.id }
      });

      sendSuccess(res, { removed: true }, 'Friend removed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel friend request
   * DELETE /api/friends/request/:userId
   */
  async cancelFriendRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const { userId } = req.params;

      const friendRequest = await prisma.friendRequest.findFirst({
        where: {
          senderId: req.user.id,
          receiverId: userId,
          status: 'PENDING'
        }
      });

      if (!friendRequest) {
        throw new NotFoundError('Friend request not found');
      }

      await prisma.friendRequest.delete({
        where: { id: friendRequest.id }
      });

      sendSuccess(res, { cancelled: true }, 'Friend request cancelled successfully');
    } catch (error) {
      next(error);
    }
  }
}

// Export controller instance
export const friendController = new FriendController(); 