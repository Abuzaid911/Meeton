/**
 * API Response Utility
 * Provides consistent response format across all endpoints
 */

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    statusCode?: number;
    details?: any;
  };
  timestamp?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore?: boolean;
  };
}

export class ApiResponse {
  /**
   * Success response
   */
  static success<T>(data: T, message?: string): APIResponse<T> {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Success response with pagination
   */
  static successWithPagination<T>(
    data: T,
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore?: boolean;
    },
    message?: string
  ): APIResponse<T> {
    return {
      success: true,
      data,
      message,
      pagination,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Error response
   */
  static error(
    message: string,
    error?: any,
    statusCode?: number
  ): APIResponse<null> {
    let errorCode = 'UNKNOWN_ERROR';
    let errorMessage = message;
    let errorDetails = undefined;

    if (error) {
      if (error.name === 'ValidationError') {
        errorCode = 'VALIDATION_ERROR';
      } else if (error.name === 'NotFoundError') {
        errorCode = 'NOT_FOUND';
      } else if (error.name === 'AuthenticationError') {
        errorCode = 'AUTHENTICATION_ERROR';
      } else if (error.name === 'AuthorizationError') {
        errorCode = 'AUTHORIZATION_ERROR';
      } else if (error.code) {
        errorCode = error.code;
      }

      if (error.message) {
        errorMessage = error.message;
      }

      if (error.details) {
        errorDetails = error.details;
      }
    }

    return {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        statusCode,
        details: errorDetails,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validation error response
   */
  static validationError(errors: any[]): APIResponse<null> {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Not found response
   */
  static notFound(resource: string = 'Resource'): APIResponse<null> {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `${resource} not found`,
        statusCode: 404,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Unauthorized response
   */
  static unauthorized(message: string = 'Unauthorized'): APIResponse<null> {
    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message,
        statusCode: 401,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Forbidden response
   */
  static forbidden(message: string = 'Forbidden'): APIResponse<null> {
    return {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message,
        statusCode: 403,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Too many requests response
   */
  static tooManyRequests(message: string = 'Too many requests'): APIResponse<null> {
    return {
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message,
        statusCode: 429,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Internal server error response
   */
  static internalError(message: string = 'Internal server error'): APIResponse<null> {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message,
        statusCode: 500,
      },
      timestamp: new Date().toISOString(),
    };
  }
} 