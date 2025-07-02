"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireEventAccess = exports.requireOwnership = exports.authorize = exports.optionalAuth = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errors_1 = require("../utils/errors");
const database_1 = require("../config/database");
const env_1 = require("../config/env");
/**
 * Authentication middleware - MUST validate tokens on protected routes
 * Extracts JWT from Authorization header and validates it
 */
const authenticate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            throw new errors_1.AuthenticationError('Authorization header required');
        }
        const token = authHeader.replace('Bearer ', '');
        if (!token || token === 'Bearer') {
            throw new errors_1.AuthenticationError('Token required');
        }
        // Verify JWT token
        const env = (0, env_1.getEnv)();
        const payload = jsonwebtoken_1.default.verify(token, env.JWT_SECRET);
        // Check if user still exists in database
        const user = yield database_1.prisma.user.findUnique({
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
            throw new errors_1.AuthenticationError('User not found');
        }
        // Update last active timestamp
        yield database_1.prisma.user.update({
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
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            next(new errors_1.AuthenticationError('Invalid token'));
        }
        else if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            next(new errors_1.AuthenticationError('Token expired'));
        }
        else {
            next(error);
        }
    }
});
exports.authenticate = authenticate;
/**
 * Optional authentication middleware
 * Sets user if valid token is provided, but doesn't require it
 */
const optionalAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
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
        const env = (0, env_1.getEnv)();
        const payload = jsonwebtoken_1.default.verify(token, env.JWT_SECRET);
        // Check if user exists
        const user = yield database_1.prisma.user.findUnique({
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
    }
    catch (error) {
        // For optional auth, we continue even if token is invalid
        next();
    }
});
exports.optionalAuth = optionalAuth;
/**
 * Authorization middleware - checks if user can access specific resource
 */
const authorize = (roles = []) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (!req.user) {
                throw new errors_1.AuthenticationError('Authentication required');
            }
            // For now, we don't have roles system, so all authenticated users are authorized
            // This can be extended later when roles are added to the User model
            next();
        }
        catch (error) {
            next(error);
        }
    });
};
exports.authorize = authorize;
/**
 * Resource ownership middleware - checks if user owns the resource
 */
const requireOwnership = (resourceType) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (!req.user) {
                throw new errors_1.AuthenticationError('Authentication required');
            }
            const resourceId = req.params.id;
            if (!resourceId) {
                throw new errors_1.AuthorizationError('Resource ID required');
            }
            let isOwner = false;
            switch (resourceType) {
                case 'event':
                    const event = yield database_1.prisma.event.findUnique({
                        where: { id: resourceId },
                        select: { hostId: true },
                    });
                    isOwner = (event === null || event === void 0 ? void 0 : event.hostId) === req.user.id;
                    break;
                case 'user':
                    isOwner = resourceId === req.user.id;
                    break;
                case 'comment':
                    const comment = yield database_1.prisma.comment.findUnique({
                        where: { id: resourceId },
                        select: { userId: true },
                    });
                    isOwner = (comment === null || comment === void 0 ? void 0 : comment.userId) === req.user.id;
                    break;
                default:
                    throw new errors_1.AuthorizationError('Unknown resource type');
            }
            if (!isOwner) {
                throw new errors_1.AuthorizationError('Access denied: insufficient permissions');
            }
            next();
        }
        catch (error) {
            next(error);
        }
    });
};
exports.requireOwnership = requireOwnership;
/**
 * Event access middleware - checks if user can access event based on privacy level
 */
const requireEventAccess = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const eventId = req.params.id || req.params.eventId;
        if (!eventId) {
            throw new errors_1.AuthorizationError('Event ID required');
        }
        const event = yield database_1.prisma.event.findUnique({
            where: { id: eventId },
            select: {
                id: true,
                hostId: true,
                privacyLevel: true,
            },
        });
        if (!event) {
            throw new errors_1.AuthorizationError('Event not found');
        }
        // Public events are accessible to everyone
        if (event.privacyLevel === 'PUBLIC') {
            return next();
        }
        // Private and friends-only events require authentication
        if (!req.user) {
            throw new errors_1.AuthenticationError('Authentication required for private events');
        }
        // Host always has access
        if (event.hostId === req.user.id) {
            return next();
        }
        // For private events, only attendees have access
        if (event.privacyLevel === 'PRIVATE') {
            const attendee = yield database_1.prisma.attendee.findUnique({
                where: {
                    userId_eventId: {
                        userId: req.user.id,
                        eventId: event.id,
                    },
                },
            });
            if (!attendee) {
                throw new errors_1.AuthorizationError('Access denied: private event');
            }
        }
        // For friends-only events, check friendship status
        if (event.privacyLevel === 'FRIENDS_ONLY') {
            const friendship = yield database_1.prisma.friendRequest.findFirst({
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
                const attendee = yield database_1.prisma.attendee.findUnique({
                    where: {
                        userId_eventId: {
                            userId: req.user.id,
                            eventId: event.id,
                        },
                    },
                });
                if (!attendee) {
                    throw new errors_1.AuthorizationError('Access denied: friends only');
                }
            }
        }
        next();
    }
    catch (error) {
        next(error);
    }
});
exports.requireEventAccess = requireEventAccess;
