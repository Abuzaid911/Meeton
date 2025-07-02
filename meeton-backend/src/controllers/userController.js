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
Object.defineProperty(exports, "__esModule", { value: true });
exports.userController = void 0;
const userService_1 = require("../services/userService");
const errorHandler_1 = require("../middleware/errorHandler");
const errors_1 = require("../utils/errors");
/**
 * User Controller - Controllers ONLY handle HTTP concerns
 * Following strict controller pattern from implementation rules
 */
class UserController {
    /**
     * Get current user profile
     * GET /api/users/profile
     */
    getProfile(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!req.user) {
                    throw new errors_1.AuthenticationError('Authentication required');
                }
                const user = yield userService_1.userService.getUserById(req.user.id);
                if (!user) {
                    throw new errors_1.NotFoundError('User not found');
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
                (0, errorHandler_1.sendSuccess)(res, userResponse, 'Profile retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Update user profile
     * PUT /api/users/profile
     */
    updateProfile(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!req.user) {
                    throw new errors_1.AuthenticationError('Authentication required');
                }
                const { name, bio, location } = req.body;
                const updatedUser = yield userService_1.userService.updateProfile(req.user.id, {
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
                (0, errorHandler_1.sendSuccess)(res, userResponse, 'Profile updated successfully');
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Get user by ID
     * GET /api/users/:id
     */
    getUserById(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!req.user) {
                    throw new errors_1.AuthenticationError('Authentication required');
                }
                const { id } = req.params;
                const user = yield userService_1.userService.getUserById(id);
                if (!user) {
                    throw new errors_1.NotFoundError('User not found');
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
                (0, errorHandler_1.sendSuccess)(res, userResponse, 'User retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Search users
     * GET /api/users/search
     */
    searchUsers(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!req.user) {
                    throw new errors_1.AuthenticationError('Authentication required');
                }
                const { q, limit = 20, offset = 0 } = req.query;
                if (!q || typeof q !== 'string') {
                    throw new errors_1.ValidationError('Search query is required');
                }
                const users = yield userService_1.userService.searchUsers(q, Number(limit), Number(offset));
                (0, errorHandler_1.sendSuccess)(res, users, 'Search completed successfully');
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Check username availability
     * GET /api/users/check-username/:username
     */
    checkUsernameAvailability(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { username } = req.params;
                if (!username) {
                    throw new errors_1.ValidationError('Username is required');
                }
                const isAvailable = yield userService_1.userService.checkUsernameAvailability(username);
                (0, errorHandler_1.sendSuccess)(res, { available: isAvailable }, 'Username availability checked');
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Complete welcome profile (first-time setup)
     * POST /api/users/complete-welcome
     */
    completeWelcomeProfile(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!req.user) {
                    throw new errors_1.AuthenticationError('Authentication required');
                }
                const { name, username } = req.body;
                const updatedUser = yield userService_1.userService.completeWelcomeProfile(req.user.id, {
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
                (0, errorHandler_1.sendSuccess)(res, userResponse, 'Welcome profile completed successfully');
            }
            catch (error) {
                next(error);
            }
        });
    }
}
// Export controller instance
exports.userController = new UserController();
