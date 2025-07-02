import { prisma } from '../config/database';
import { 
  NotFoundError,
  ValidationError 
} from '../utils/errors';

// Type definitions for selected user data
type UserProfile = {
  id: string;
  email: string | null;
  username: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  location: string | null;
  onboardingCompleted: boolean;
  emailVerified: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type PublicUserProfile = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  location: string | null;
  createdAt: Date;
};

/**
 * User Service - ALL user-related business logic
 * Following service layer pattern from implementation rules
 */
class UserService {

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserProfile | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          image: true,
          bio: true,
          location: true,
          interests: true,
          onboardingCompleted: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: {
    name?: string;
    bio?: string;
    location?: string;
  }): Promise<UserProfile> {
    try {
      // Validate input data
      if (data.name !== undefined && data.name.trim().length === 0) {
        throw new ValidationError('Name cannot be empty');
      }

      if (data.bio !== undefined && data.bio.length > 500) {
        throw new ValidationError('Bio cannot exceed 500 characters');
      }

      if (data.location !== undefined && data.location.length > 100) {
        throw new ValidationError('Location cannot exceed 100 characters');
      }



      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        throw new NotFoundError('User not found');
      }

      // Update user profile
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(data.name !== undefined && { name: data.name.trim() }),
          ...(data.bio !== undefined && { bio: data.bio.trim() }),
          ...(data.location !== undefined && { location: data.location.trim() }),

          updatedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          image: true,
          bio: true,
          location: true,
          interests: true,
          onboardingCompleted: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      console.log('Profile updated for user:', userId);
      return updatedUser;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Search users by name or username
   */
  async searchUsers(query: string, limit: number = 20, offset: number = 0): Promise<PublicUserProfile[]> {
    try {
      const users = await prisma.user.findMany({
        where: {
          OR: [
            {
              name: {
                contains: query,
                mode: 'insensitive',
              },
            },
            {
              username: {
                contains: query,
                mode: 'insensitive',
              },
            },
          ],
        },
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          bio: true,
          location: true,
          createdAt: true,
          email: false, // Don't expose email in search
          updatedAt: false,
        },
        take: Math.min(limit, 50), // Max 50 results
        skip: offset,
        orderBy: {
          name: 'asc',
        },
      });

      return users;
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  /**
   * Get user's public profile
   */
  async getPublicProfile(userId: string): Promise<PublicUserProfile | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          bio: true,
          location: true,
          createdAt: true,
          // Don't expose sensitive information
          email: false,
          emailVerified: false,
          onboardingCompleted: false,
        },
      });

      return user;
    } catch (error) {
      console.error('Error getting public profile:', error);
      throw error;
    }
  }

  /**
   * Check if username is available
   */
  async checkUsernameAvailability(username: string, excludeUserId?: string): Promise<boolean> {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { username: username.toLowerCase() },
        select: { id: true },
      });

      // If no user found, username is available
      if (!existingUser) return true;

      // If user found but it's the current user, username is available
      if (excludeUserId && existingUser.id === excludeUserId) return true;

      // Username is taken
      return false;
    } catch (error) {
      console.error('Error checking username availability:', error);
      throw error;
    }
  }

  /**
   * Complete welcome profile (first-time setup)
   */
  async completeWelcomeProfile(userId: string, data: {
    name: string;
    username: string;
  }): Promise<UserProfile> {
    try {
      // Validate input data
      if (!data.name.trim()) {
        throw new ValidationError('Name is required');
      }

      if (!data.username.trim()) {
        throw new ValidationError('Username is required');
      }

      // Validate username format
      const usernameRegex = /^[a-z0-9_]+$/;
      if (!usernameRegex.test(data.username)) {
        throw new ValidationError('Username can only contain lowercase letters, numbers, and underscores');
      }

      if (data.username.length < 3 || data.username.length > 30) {
        throw new ValidationError('Username must be between 3 and 30 characters');
      }

      // Check if username is available
      const isUsernameAvailable = await this.checkUsernameAvailability(data.username, userId);
      if (!isUsernameAvailable) {
        throw new ValidationError('Username is already taken');
      }

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        throw new NotFoundError('User not found');
      }

      // Update user profile with welcome data
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          name: data.name.trim(),
          username: data.username.toLowerCase(),
          onboardingCompleted: true,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          image: true,
          bio: true,
          location: true,
          onboardingCompleted: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      console.log('Welcome profile completed for user:', userId);
      return updatedUser;
    } catch (error) {
      console.error('Error completing welcome profile:', error);
      throw error;
    }
  }
}

// Export service instance
export const userService = new UserService(); 