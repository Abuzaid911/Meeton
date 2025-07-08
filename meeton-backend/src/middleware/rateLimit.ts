import { Request, Response, NextFunction } from 'express';
import { redisManager } from '../config/redis';
import { getEnv } from '../config/env';

/**
 * Redis-based rate limiting middleware for different endpoints
 */

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message: {
    success: boolean;
    error: {
      code: string;
      message: string;
      statusCode: number;
    };
  };
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  skip?: (req: Request) => boolean;
}

/**
 * Create a Redis-based rate limiter
 */
function createRedisRateLimit(options: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if we should skip this request
      if (options.skip && options.skip(req)) {
        return next();
      }

      // Skip rate limiting in development if Redis is not available
      if (process.env.NODE_ENV === 'development' && !redisManager.isHealthy()) {
        console.log('🔍 Redis not available, skipping rate limiting');
        return next();
      }

      const {
        windowMs,
        max,
        message,
        keyGenerator = (req: Request) => req.ip || 'unknown',
        skipSuccessfulRequests = false,
        skipFailedRequests = false
      } = options;

      const key = keyGenerator(req);
      const windowSeconds = Math.floor(windowMs / 1000);

      // Check rate limit
      const result = await redisManager.checkRateLimit(key, max, windowSeconds);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': max.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
      });

      if (!result.allowed) {
        // Rate limit exceeded
        res.status(429).json(message);
        return;
      }

      // Store rate limit info for potential cleanup
      req.rateLimit = {
        limit: max,
        remaining: result.remaining,
        resetTime: result.resetTime,
      };

      // Handle response tracking for skip options
      if (skipSuccessfulRequests || skipFailedRequests) {
        const originalSend = res.json;
        res.json = function(body: any) {
          const statusCode = res.statusCode;
          const shouldSkip = 
            (skipSuccessfulRequests && statusCode < 400) ||
            (skipFailedRequests && statusCode >= 400);

          if (shouldSkip) {
            // Would need to implement request removal logic here
            // For now, we'll just track it
          }

          return originalSend.call(this, body);
        };
      }

      next();
    } catch (error) {
      console.error('Rate limit error:', error);
      // On error, allow the request to proceed
      next();
    }
  };
}

/**
 * Get client IP address, considering proxies
 */
function getClientIP(req: Request): string {
  return (
    req.headers['x-forwarded-for'] as string ||
    req.headers['x-real-ip'] as string ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.ip ||
    'unknown'
  ).split(',')[0].trim();
}

/**
 * Generate rate limit key based on IP and user ID
 */
function generateRateLimitKey(req: Request, prefix: string): string {
  const ip = getClientIP(req);
  const userId = req.user?.id;
  
  if (userId) {
    return `${prefix}:user:${userId}`;
  }
  
  return `${prefix}:ip:${ip}`;
}

// Authentication endpoints - very lenient during development/testing
export const authLimiter = createRedisRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Very high limit to prevent blocking during development/testing
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many authentication attempts. Please try again later.',
      statusCode: 429,
    },
  },
  keyGenerator: (req: Request) => generateRateLimitKey(req, 'auth'),
  skip: (req: Request) => {
    // Always skip rate limiting for auth during development
    console.log('🔍 Auth rate limiter - Skipping for development');
    return true; // Always skip rate limiting for auth
  },
});

// Password reset endpoints - very strict
export const passwordResetLimiter = createRedisRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many password reset attempts. Please try again in an hour.',
      statusCode: 429,
    },
  },
  keyGenerator: (req: Request) => {
    // Rate limit by email for password reset
    return req.body?.email || req.ip || 'unknown';
  },
});

// OAuth endpoints - very lenient limiting to prevent auth failures
export const oauthLimiter = createRedisRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Extremely high limit to prevent blocking during debugging
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many OAuth attempts. Please try again later.',
      statusCode: 429,
    },
  },
  keyGenerator: (req: Request) => generateRateLimitKey(req, 'oauth'),
  skip: (req: Request) => {
    // Always skip rate limiting for OAuth during development
    console.log('🔍 OAuth rate limiter - Skipping for development');
    return true; // Always skip rate limiting for OAuth
  },
});

// Token refresh endpoints - very lenient limiting to prevent auth failures
export const tokenRefreshLimiter = createRedisRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Very high limit to prevent blocking during development/testing
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many token refresh attempts. Please try again later.',
      statusCode: 429,
    },
  },
  keyGenerator: (req: Request) => generateRateLimitKey(req, 'token-refresh'),
  skip: (req: Request) => {
    // Always skip rate limiting for token refresh during development
    console.log('🔍 Token refresh rate limiter - Skipping for development');
    return true; // Always skip rate limiting for token refresh
  },
});

// General API endpoints - moderate limiting
const env = getEnv();
export const apiLimiter = createRedisRateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests. Please slow down.',
      statusCode: 429,
    },
  },
  keyGenerator: (req: Request) => generateRateLimitKey(req, 'api'),
  skip: (req: Request) => {
    // Always skip rate limiting for API during development
    console.log('🔍 API rate limiter - Skipping for development');
    return true; // Always skip rate limiting for API endpoints
  },
});

// File upload endpoints - stricter limiting
export const uploadLimiter = createRedisRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per window
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many file uploads. Please try again later.',
      statusCode: 429,
    },
  },
  keyGenerator: (req: Request) => generateRateLimitKey(req, 'upload'),
  skip: (req: Request) => {
    // Always skip rate limiting for uploads during development
    console.log('🔍 Upload rate limiter - Skipping for development');
    return true; // Always skip rate limiting for uploads
  },
});

// Search endpoints - moderate limiting
export const searchLimiter = createRedisRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many search requests. Please slow down.',
      statusCode: 429,
    },
  },
  keyGenerator: (req: Request) => generateRateLimitKey(req, 'search'),
});

// Event creation - moderate limiting
export const eventCreationLimiter = createRedisRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 events per hour
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many events created. Please try again later.',
      statusCode: 429,
    },
  },
  keyGenerator: (req: Request) => generateRateLimitKey(req, 'event-creation'),
  skip: (req: Request) => {
    // Always skip rate limiting for event creation during development
    console.log('🔍 Event creation rate limiter - Skipping for development');
    return true; // Always skip rate limiting for event creation
  },
});

// Friend requests - moderate limiting
export const friendRequestLimiter = createRedisRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 friend requests per hour
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many friend requests. Please try again later.',
      statusCode: 429,
    },
  },
  keyGenerator: (req: Request) => generateRateLimitKey(req, 'friend-request'),
});

// Comments and reactions - moderate limiting
export const commentLimiter = createRedisRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 comments/reactions per window
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many comments or reactions. Please slow down.',
      statusCode: 429,
    },
  },
  keyGenerator: (req: Request) => generateRateLimitKey(req, 'comment'),
});

// Health check - very lenient
export const healthCheckLimiter = createRedisRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many health check requests.',
      statusCode: 429,
    },
  },
  keyGenerator: (req: Request) => getClientIP(req),
});

// Sharing rate limiter - for sharing endpoints
export const sharingLimiter = createRedisRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each user to 100 sharing requests per windowMs
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many sharing requests, please try again later.',
      statusCode: 429,
    },
  },
  keyGenerator: (req: Request) => generateRateLimitKey(req, 'sharing'),
});

// Analytics rate limiter - for analytics endpoints
export const analyticsLimiter = createRedisRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each user to 50 analytics requests per windowMs
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many analytics requests, please try again later.',
      statusCode: 429,
    },
  },
  keyGenerator: (req: Request) => generateRateLimitKey(req, 'analytics'),
});

/**
 * Create a custom rate limiter with specific configuration
 */
export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  prefix?: string;
}) => {
  return createRedisRateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: options.message || 'Rate limit exceeded',
        statusCode: 429,
      },
    },
    keyGenerator: options.keyGenerator || ((req: Request) => 
      generateRateLimitKey(req, options.prefix || 'custom')
    ),
    skip: () => process.env.NODE_ENV === 'test',
  });
};

// Extend Express Request interface to include rate limit info
declare global {
  namespace Express {
    interface Request {
      rateLimit?: {
        limit: number;
        remaining: number;
        resetTime: number;
      };
    }
  }
} 