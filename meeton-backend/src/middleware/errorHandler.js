"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.sendError = exports.sendSuccess = exports.errorHandler = void 0;
const library_1 = require("@prisma/client/runtime/library");
const zod_1 = require("zod");
const winston_1 = __importDefault(require("winston"));
const errors_1 = require("../utils/errors");
// Configure logger
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.File({ filename: 'error.log', level: 'error' }),
        new winston_1.default.transports.File({ filename: 'combined.log' }),
    ],
});
// Add console transport for development
if (process.env.NODE_ENV === 'development') {
    logger.add(new winston_1.default.transports.Console({
        format: winston_1.default.format.simple()
    }));
}
/**
 * Global error handler - MUST be last middleware
 * Handles all errors and ensures consistent API response format
 */
const errorHandler = (error, req, res, next) => {
    var _a;
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
        userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
        timestamp: new Date().toISOString(),
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
        },
    };
    // Handle custom application errors
    if ((0, errors_1.isCustomError)(error)) {
        // Log at appropriate level
        if (error.statusCode >= 500) {
            logger.error('Application error', errorContext);
        }
        else if (error.statusCode >= 400) {
            logger.warn('Client error', errorContext);
        }
        const response = {
            success: false,
            error: Object.assign({ code: error.code, message: error.message, statusCode: error.statusCode }, (error instanceof errors_1.ValidationError && error.details && { details: error.details })),
        };
        res.status(error.statusCode).json(response);
        return;
    }
    // Handle Prisma errors
    if (error instanceof library_1.PrismaClientKnownRequestError) {
        logger.warn('Prisma client error', Object.assign(Object.assign({}, errorContext), { prismaCode: error.code }));
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
        const response = {
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
    if (error instanceof library_1.PrismaClientValidationError) {
        logger.warn('Prisma validation error', errorContext);
        const response = {
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
    if (error instanceof zod_1.ZodError) {
        logger.warn('Zod validation error', errorContext);
        const details = error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
        }));
        const response = {
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
        const response = {
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
        const response = {
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
    const response = {
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
exports.errorHandler = errorHandler;
/**
 * Success response helper
 */
const sendSuccess = (res, data, message, statusCode = 200, pagination) => {
    const response = Object.assign(Object.assign({ success: true, data }, (message && { message })), (pagination && { pagination }));
    res.status(statusCode).json(response);
};
exports.sendSuccess = sendSuccess;
/**
 * Error response helper
 */
const sendError = (res, error) => {
    const response = {
        success: false,
        error,
    };
    res.status(error.statusCode).json(response);
};
exports.sendError = sendError;
/**
 * Not found handler for unmatched routes
 */
const notFoundHandler = (req, res) => {
    const response = {
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: 'The requested resource was not found',
            statusCode: 404,
        },
    };
    res.status(404).json(response);
};
exports.notFoundHandler = notFoundHandler;
