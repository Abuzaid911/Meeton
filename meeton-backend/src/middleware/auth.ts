import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import { prisma } from '../config/database';
import { getEnv } from '../config/env';

// User type is extended in types/express.d.ts

/**
 * JWT Token payload interface
 */
interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  name?: string;
  iat: number;
  exp: number;
}

/**
 * Authentication middleware - MUST validate tokens on protected routes
 * Extracts JWT from Authorization header and validates it
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new AuthenticationError('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token || token === 'Bearer') {
      throw new AuthenticationError('Token required');
    }

    // Verify JWT token
    const env = getEnv();
    const payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload;

    // Check if user still exists in database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        lastActive: true,
      },
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Update last active timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActive: new Date() },
    });

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name || undefined,
      iat: payload.iat,
      exp: payload.exp,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError('Token expired'));
    } else {
      next(error);
    }
  }
};

/**
 * Optional authentication middleware
 * Sets user if valid token is provided, but doesn't require it
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token || token === 'Bearer') {
      return next();
    }

    // Verify JWT token
    const env = getEnv();
    const payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
      },
    });

    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name || undefined,
        iat: payload.iat,
        exp: payload.exp,
      };
    }

    next();
  } catch (error) {
    // For optional auth, we continue even if token is invalid
    next();
  }
};

/**
 * Authorization middleware - checks if user can access specific resource
 */
export const authorize = (roles: string[] = []) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      // For now, we don't have roles system, so all authenticated users are authorized
      // This can be extended later when roles are added to the User model
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Resource ownership middleware - checks if user owns the resource
 */
export const requireOwnership = (resourceType: 'event' | 'user' | 'comment') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const resourceId = req.params.id;
      if (!resourceId) {
        throw new AuthorizationError('Resource ID required');
      }

      let isOwner = false;

      switch (resourceType) {
        case 'event':
          const event = await prisma.event.findUnique({
            where: { id: resourceId },
            select: { hostId: true },
          });
          isOwner = event?.hostId === req.user.id;
          break;

        case 'user':
          isOwner = resourceId === req.user.id;
          break;

        case 'comment':
          const comment = await prisma.comment.findUnique({
            where: { id: resourceId },
            select: { userId: true },
          });
          isOwner = comment?.userId === req.user.id;
          break;

        default:
          throw new AuthorizationError('Unknown resource type');
      }

      if (!isOwner) {
        throw new AuthorizationError('Access denied: insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Event access middleware - checks if user can access event based on privacy level
 */
export const requireEventAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const eventId = req.params.id || req.params.eventId;
    if (!eventId) {
      throw new AuthorizationError('Event ID required');
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        hostId: true,
        privacyLevel: true,
      },
    });

    if (!event) {
      throw new AuthorizationError('Event not found');
    }

    // Public events are accessible to everyone
    if (event.privacyLevel === 'PUBLIC') {
      return next();
    }

    // Private and friends-only events require authentication
    if (!req.user) {
      throw new AuthenticationError('Authentication required for private events');
    }

    // Host always has access
    if (event.hostId === req.user.id) {
      return next();
    }

    // For private events, only attendees have access
    if (event.privacyLevel === 'PRIVATE') {
      const attendee = await prisma.attendee.findUnique({
        where: {
          userId_eventId: {
            userId: req.user.id,
            eventId: event.id,
          },
        },
      });

      if (!attendee) {
        throw new AuthorizationError('Access denied: private event');
      }
    }

    // For friends-only events, check friendship status
    if (event.privacyLevel === 'FRIENDS_ONLY') {
      const friendship = await prisma.friendRequest.findFirst({
        where: {
          OR: [
            {
              senderId: req.user.id,
              receiverId: event.hostId,
              status: 'ACCEPTED',
            },
            {
              senderId: event.hostId,
              receiverId: req.user.id,
              status: 'ACCEPTED',
            },
          ],
        },
      });

      if (!friendship) {
        const attendee = await prisma.attendee.findUnique({
          where: {
            userId_eventId: {
              userId: req.user.id,
              eventId: event.id,
            },
          },
        });

        if (!attendee) {
          throw new AuthorizationError('Access denied: friends only');
        }
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}; 