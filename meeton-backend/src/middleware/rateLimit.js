"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiter = exports.healthCheckLimiter = exports.commentLimiter = exports.friendRequestLimiter = exports.eventCreationLimiter = exports.searchLimiter = exports.uploadLimiter = exports.apiLimiter = exports.passwordResetLimiter = exports.authLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_1 = require("../config/env");
/**
 * Rate limiting configuration as per implementation rules
 */
// Authentication endpoints - strict limiting
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
        success: false,
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many authentication attempts. Please try again later.',
            statusCode: 429,
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Rate limit by IP address
        return req.ip || 'unknown';
    },
    skip: (req) => {
        // Skip rate limiting in test environment
        return process.env.NODE_ENV === 'test';
    },
});
// Password reset endpoints - very strict
exports.passwordResetLimiter = (0, express_rate_limit_1.default)({
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
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        var _a;
        // Rate limit by email for password reset
        return ((_a = req.body) === null || _a === void 0 ? void 0 : _a.email) || req.ip || 'unknown';
    },
});
// General API endpoints - moderate limiting
const env = (0, env_1.getEnv)();
exports.apiLimiter = (0, express_rate_limit_1.default)({
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
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        var _a;
        // Rate limit by user ID if authenticated, otherwise by IP
        return ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || req.ip || 'unknown';
    },
});
// File upload endpoints - stricter limiting
exports.uploadLimiter = (0, express_rate_limit_1.default)({
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
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        var _a;
        return ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || req.ip || 'unknown';
    },
});
// Search endpoints - moderate limiting
exports.searchLimiter = (0, express_rate_limit_1.default)({
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
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        var _a;
        return ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || req.ip || 'unknown';
    },
});
// Event creation - moderate limiting
exports.eventCreationLimiter = (0, express_rate_limit_1.default)({
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
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        var _a;
        return ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || req.ip || 'unknown';
    },
});
// Friend requests - moderate limiting
exports.friendRequestLimiter = (0, express_rate_limit_1.default)({
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
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        var _a;
        return ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || req.ip || 'unknown';
    },
});
// Comments and reactions - moderate limiting
exports.commentLimiter = (0, express_rate_limit_1.default)({
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
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        var _a;
        return ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || req.ip || 'unknown';
    },
});
// Health check - very lenient
exports.healthCheckLimiter = (0, express_rate_limit_1.default)({
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
    standardHeaders: true,
    legacyHeaders: false,
});
/**
 * Create a custom rate limiter with specific configuration
 */
const createRateLimiter = (options) => {
    return (0, express_rate_limit_1.default)({
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
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: options.keyGenerator || ((req) => req.ip || 'unknown'),
        skip: () => process.env.NODE_ENV === 'test',
    });
};
exports.createRateLimiter = createRateLimiter;
