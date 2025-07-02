import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/userService';
import { sendSuccess, sendError } from '../middleware/errorHandler';
import { 
  AuthenticationError, 
  ValidationError,
  NotFoundError 
} from '../utils/errors';

/**
 * User Controller - Controllers ONLY handle HTTP concerns
 * Following strict controller pattern from implementation rules
 */
class UserController {

  /**
   * Get current user profile
   * GET /api/users/profile
   */
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const user = await userService.getUserById(req.user.id);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const userResponse = {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        image: user.image,
        bio: user.bio,
        location: user.location,
        onboardingCompleted: user.onboardingCompleted,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      };

      sendSuccess(res, userResponse, 'Profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile
   * PUT /api/users/profile
   */
  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const { name, bio, location } = req.body;
      
      const updatedUser = await userService.updateProfile(req.user.id, {
        name,
        bio,
        location,
      });

      const userResponse = {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        name: updatedUser.name,
        image: updatedUser.image,
        bio: updatedUser.bio,
        location: updatedUser.location,

        onboardingCompleted: updatedUser.onboardingCompleted,
        emailVerified: updatedUser.emailVerified,
        createdAt: updatedUser.createdAt,
      };

      sendSuccess(res, userResponse, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user by ID
   * GET /api/users/:id
   */
  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const { id } = req.params;
      const user = await userService.getUserById(id);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Return public profile information
      const userResponse = {
        id: user.id,
        username: user.username,
        name: user.name,
        image: user.image,
        bio: user.bio,
        location: user.location,
        createdAt: user.createdAt,
      };

      sendSuccess(res, userResponse, 'User retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search users
   * GET /api/users/search
   */
  async searchUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const { q, limit = 20, offset = 0 } = req.query;
      
      if (!q || typeof q !== 'string') {
        throw new ValidationError('Search query is required');
      }

      const users = await userService.searchUsers(q, Number(limit), Number(offset));
      
      sendSuccess(res, users, 'Search completed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check username availability
   * GET /api/users/check-username/:username
   */
  async checkUsernameAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username } = req.params;
      
      if (!username) {
        throw new ValidationError('Username is required');
      }

      const isAvailable = await userService.checkUsernameAvailability(username);
      
      sendSuccess(res, { available: isAvailable }, 'Username availability checked');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Complete welcome profile (first-time setup)
   * POST /api/users/complete-welcome
   */
  async completeWelcomeProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const { name, username } = req.body;
      
      const updatedUser = await userService.completeWelcomeProfile(req.user.id, {
        name,
        username,
      });

      const userResponse = {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        name: updatedUser.name,
        image: updatedUser.image,
        bio: updatedUser.bio,
        location: updatedUser.location,
        onboardingCompleted: updatedUser.onboardingCompleted,
        emailVerified: updatedUser.emailVerified,
        createdAt: updatedUser.createdAt,
      };

      sendSuccess(res, userResponse, 'Welcome profile completed successfully');
    } catch (error) {
      next(error);
    }
  }
}

// Export controller instance
export const userController = new UserController(); 