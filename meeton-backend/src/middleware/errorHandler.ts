import { Request, Response, NextFunction } from 'express';
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library';
import { ZodError } from 'zod';
import winston from 'winston';
import { 
  ValidationError, 
  AuthenticationError, 
  AuthorizationError, 
  NotFoundError, 
  ConflictError, 
  RateLimitError, 
  InternalServerError,
  isCustomError 
} from '../utils/errors';

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Add console transport for development
if (process.env.NODE_ENV === 'development') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

/**
 * API Response format interfaces - MUST follow these exact structures
 */
interface APIResponse<T> {
  success: true;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface APIError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any[];
    statusCode: number;
  };
}

/**
 * Global error handler - MUST be last middleware
 * Handles all errors and ensures consistent API response format
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Don't log if response is already sent
  if (res.headersSent) {
    return next(error);
  }

  // Log error with context
  const errorContext = {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  };

  // Handle custom application errors
  if (isCustomError(error)) {
    // Log at appropriate level
    if (error.statusCode >= 500) {
      logger.error('Application error', errorContext);
    } else if (error.statusCode >= 400) {
      logger.warn('Client error', errorContext);
    }

    const response: APIError = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        ...(error instanceof ValidationError && error.details && { details: error.details }),
      },
    };

    res.status(error.statusCode).json(response);
    return;
  }

  // Handle Prisma errors
  if (error instanceof PrismaClientKnownRequestError) {
    logger.warn('Prisma client error', { ...errorContext, prismaCode: error.code });

    let statusCode = 400;
    let code = 'DATABASE_ERROR';
    let message = 'Database operation failed';

    switch (error.code) {
      case 'P2002':
        statusCode = 409;
        code = 'CONFLICT_ERROR';
        message = 'A record with this information already exists';
        break;
      case 'P2025':
        statusCode = 404;
        code = 'NOT_FOUND_ERROR';
        message = 'Record not found';
        break;
      case 'P2003':
        statusCode = 400;
        code = 'VALIDATION_ERROR';
        message = 'Invalid reference provided';
        break;
      case 'P2014':
        statusCode = 400;
        code = 'VALIDATION_ERROR';
        message = 'The change would violate a required relation';
        break;
      default:
        statusCode = 500;
        code = 'INTERNAL_SERVER_ERROR';
        message = process.env.NODE_ENV === 'production' 
          ? 'An internal error occurred' 
          : error.message;
    }

    const response: APIError = {
      success: false,
      error: {
        code,
        message,
        statusCode,
      },
    };

    res.status(statusCode).json(response);
    return;
  }

  // Handle Prisma validation errors
  if (error instanceof PrismaClientValidationError) {
    logger.warn('Prisma validation error', errorContext);

    const response: APIError = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid data provided',
        statusCode: 400,
      },
    };

    res.status(400).json(response);
    return;
  }

  // Handle Zod validation errors (fallback)
  if (error instanceof ZodError) {
    logger.warn('Zod validation error', errorContext);

    const details = error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));

    const response: APIError = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details,
        statusCode: 400,
      },
    };

    res.status(400).json(response);
    return;
  }

  // Handle JWT errors (fallback)
  if (error.name === 'JsonWebTokenError') {
    logger.warn('JWT error', errorContext);

    const response: APIError = {
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Invalid token',
        statusCode: 401,
      },
    };

    res.status(401).json(response);
    return;
  }

  if (error.name === 'TokenExpiredError') {
    logger.warn('JWT expired', errorContext);

    const response: APIError = {
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Token expired',
        statusCode: 401,
      },
    };

    res.status(401).json(response);
    return;
  }

  // Handle unknown errors
  logger.error('Unknown error', errorContext);

  const response: APIError = {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An internal server error occurred' 
        : error.message,
      statusCode: 500,
    },
  };

  res.status(500).json(response);
};

/**
 * Success response helper
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200,
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }
): void => {
  const response: APIResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
    ...(pagination && { pagination }),
  };

  res.status(statusCode).json(response);
};

/**
 * Error response helper
 */
export const sendError = (
  res: Response,
  error: {
    code: string;
    message: string;
    details?: any[];
    statusCode: number;
  }
): void => {
  const response: APIError = {
    success: false,
    error,
  };

  res.status(error.statusCode).json(response);
};

/**
 * Not found handler for unmatched routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const response: APIError = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
      statusCode: 404,
    },
  };

  res.status(404).json(response);
}; 