import { PrismaClient, FriendRequestStatus, FriendRequest } from '../generated/prisma';
import DatabaseManager from '../config/database';

/**
 * Friend Service
 * Handles all friendship-related business logic
 * Following implementation rules for service layers
 */
export class FriendService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = DatabaseManager.getInstance();
  }

  /**
   * Send friend request
   */
  async sendFriendRequest(senderId: string, receiverId: string): Promise<boolean> {
    try {
      // Check if receiver exists
      const receiver = await this.prisma.user.findUnique({
        where: { id: receiverId }
      });

      if (!receiver) {
        return false;
      }

      // Check if friend request already exists
      const existingRequest = await this.prisma.friendRequest.findFirst({
        where: {
          OR: [
            { senderId, receiverId },
            { senderId: receiverId, receiverId: senderId }
          ],
          status: { in: ['PENDING', 'ACCEPTED'] }
        }
      });

      if (existingRequest) {
        return false; // Request already exists or users are already friends
      }

      // Create friend request
      await this.prisma.friendRequest.create({
        data: {
          senderId,
          receiverId,
          status: 'PENDING'
        }
      });

      return true;
    } catch (error) {
      console.error('Error sending friend request:', error);
      return false;
    }
  }

  /**
   * Respond to friend request
   */
  async respondToFriendRequest(requestId: string, userId: string, action: 'ACCEPTED' | 'DECLINED'): Promise<boolean> {
    try {
      // Find the friend request
      const friendRequest = await this.prisma.friendRequest.findUnique({
        where: { id: requestId }
      });

      if (!friendRequest || friendRequest.receiverId !== userId || friendRequest.status !== 'PENDING') {
        return false;
      }

      // Update the friend request status
      await this.prisma.friendRequest.update({
        where: { id: requestId },
        data: { 
          status: action as FriendRequestStatus,
          responseTime: new Date()
        }
      });

      return true;
    } catch (error) {
      console.error('Error responding to friend request:', error);
      return false;
    }
  }

  /**
   * Get friendship status between two users
   */
  async getFriendshipStatus(currentUserId: string, otherUserId: string): Promise<{
    status: 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'FRIENDS';
    requestId?: string;
  }> {
    try {
      // Check for existing friend request or friendship
      const friendRequest = await this.prisma.friendRequest.findFirst({
        where: {
          OR: [
            { senderId: currentUserId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: currentUserId }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!friendRequest) {
        return { status: 'NONE' };
      }

      if (friendRequest.status === 'ACCEPTED') {
        return { status: 'FRIENDS', requestId: friendRequest.id };
      }

      if (friendRequest.status === 'PENDING') {
        if (friendRequest.senderId === currentUserId) {
          return { status: 'PENDING_SENT', requestId: friendRequest.id };
        } else {
          return { status: 'PENDING_RECEIVED', requestId: friendRequest.id };
        }
      }

      return { status: 'NONE' };
    } catch (error) {
      console.error('Error getting friendship status:', error);
      return { status: 'NONE' };
    }
  }

  /**
   * Get user's friends list
   */
  async getFriends(userId: string, limit: number = 20, offset: number = 0): Promise<any[]> {
    try {
      const friendRequests = await this.prisma.friendRequest.findMany({
        where: {
          OR: [
            { senderId: userId },
            { receiverId: userId }
          ],
          status: 'ACCEPTED'
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
              bio: true
            }
          },
          receiver: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
              bio: true
            }
          }
        },
        take: limit,
        skip: offset,
        orderBy: { updatedAt: 'desc' }
      });

      // Map to return the friend (not the current user)
      return friendRequests.map(request => {
        return request.senderId === userId ? request.receiver : request.sender;
      });
    } catch (error) {
      console.error('Error getting friends:', error);
      return [];
    }
  }

  /**
   * Get pending friend requests for a user
   */
  async getFriendRequests(userId: string): Promise<{
    sent: any[];
    received: any[];
  }> {
    try {
      const [sentRequests, receivedRequests] = await Promise.all([
        // Requests sent by user
        this.prisma.friendRequest.findMany({
          where: {
            senderId: userId,
            status: 'PENDING'
          },
          include: {
            receiver: {
              select: {
                id: true,
                username: true,
                name: true,
                image: true,
                bio: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        // Requests received by user
        this.prisma.friendRequest.findMany({
          where: {
            receiverId: userId,
            status: 'PENDING'
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                name: true,
                image: true,
                bio: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        })
      ]);

      return {
        sent: sentRequests.map(request => ({
          id: request.id,
          user: request.receiver,
          createdAt: request.createdAt
        })),
        received: receivedRequests.map(request => ({
          id: request.id,
          user: request.sender,
          createdAt: request.createdAt
        }))
      };
    } catch (error) {
      console.error('Error getting friend requests:', error);
      return { sent: [], received: [] };
    }
  }

  /**
   * Remove friend (delete friendship)
   */
  async removeFriend(currentUserId: string, friendUserId: string): Promise<boolean> {
    try {
      const friendRequest = await this.prisma.friendRequest.findFirst({
        where: {
          OR: [
            { senderId: currentUserId, receiverId: friendUserId },
            { senderId: friendUserId, receiverId: currentUserId }
          ],
          status: 'ACCEPTED'
        }
      });

      if (!friendRequest) {
        return false;
      }

      await this.prisma.friendRequest.delete({
        where: { id: friendRequest.id }
      });

      return true;
    } catch (error) {
      console.error('Error removing friend:', error);
      return false;
    }
  }
}

export const friendService = new FriendService(); 