"use strict";
// Custom Error Classes - MUST implement these as per implementation rules
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCustomError = exports.InternalServerError = exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = void 0;
class ValidationError extends Error {
    constructor(message, details) {
        super(message);
        this.details = details;
        this.statusCode = 400;
        this.code = 'VALIDATION_ERROR';
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends Error {
    constructor(message = 'Authentication failed') {
        super(message);
        this.statusCode = 401;
        this.code = 'AUTHENTICATION_ERROR';
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends Error {
    constructor(message = 'Access denied') {
        super(message);
        this.statusCode = 403;
        this.code = 'AUTHORIZATION_ERROR';
        this.name = 'AuthorizationError';
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends Error {
    constructor(message = 'Resource not found') {
        super(message);
        this.statusCode = 404;
        this.code = 'NOT_FOUND_ERROR';
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends Error {
    constructor(message = 'Resource already exists') {
        super(message);
        this.statusCode = 409;
        this.code = 'CONFLICT_ERROR';
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
class RateLimitError extends Error {
    constructor(message = 'Rate limit exceeded') {
        super(message);
        this.statusCode = 429;
        this.code = 'TOO_MANY_REQUESTS';
        this.name = 'RateLimitError';
    }
}
exports.RateLimitError = RateLimitError;
class InternalServerError extends Error {
    constructor(message = 'Internal server error') {
        super(message);
        this.statusCode = 500;
        this.code = 'INTERNAL_SERVER_ERROR';
        this.name = 'InternalServerError';
    }
}
exports.InternalServerError = InternalServerError;
// Type guard to check if error is a custom error
const isCustomError = (error) => {
    return error.statusCode && error.code;
};
exports.isCustomError = isCustomError;
