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
exports.userService = void 0;
const database_1 = require("../config/database");
const errors_1 = require("../utils/errors");
/**
 * User Service - ALL user-related business logic
 * Following service layer pattern from implementation rules
 */
class UserService {
    /**
     * Get user by ID
     */
    getUserById(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield database_1.prisma.user.findUnique({
                    where: { id: userId },
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        name: true,
                        image: true,
                        bio: true,
                        location: true,
                        interests: true,
                        onboardingCompleted: true,
                        emailVerified: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                });
                return user;
            }
            catch (error) {
                console.error('Error getting user by ID:', error);
                throw error;
            }
        });
    }
    /**
     * Update user profile
     */
    updateProfile(userId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Validate input data
                if (data.name !== undefined && data.name.trim().length === 0) {
                    throw new errors_1.ValidationError('Name cannot be empty');
                }
                if (data.bio !== undefined && data.bio.length > 500) {
                    throw new errors_1.ValidationError('Bio cannot exceed 500 characters');
                }
                if (data.location !== undefined && data.location.length > 100) {
                    throw new errors_1.ValidationError('Location cannot exceed 100 characters');
                }
                // Check if user exists
                const existingUser = yield database_1.prisma.user.findUnique({
                    where: { id: userId },
                });
                if (!existingUser) {
                    throw new errors_1.NotFoundError('User not found');
                }
                // Update user profile
                const updatedUser = yield database_1.prisma.user.update({
                    where: { id: userId },
                    data: Object.assign(Object.assign(Object.assign(Object.assign({}, (data.name !== undefined && { name: data.name.trim() })), (data.bio !== undefined && { bio: data.bio.trim() })), (data.location !== undefined && { location: data.location.trim() })), { updatedAt: new Date() }),
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        name: true,
                        image: true,
                        bio: true,
                        location: true,
                        interests: true,
                        onboardingCompleted: true,
                        emailVerified: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                });
                console.log('Profile updated for user:', userId);
                return updatedUser;
            }
            catch (error) {
                console.error('Error updating user profile:', error);
                throw error;
            }
        });
    }
    /**
     * Search users by name or username
     */
    searchUsers(query_1) {
        return __awaiter(this, arguments, void 0, function* (query, limit = 20, offset = 0) {
            try {
                const users = yield database_1.prisma.user.findMany({
                    where: {
                        OR: [
                            {
                                name: {
                                    contains: query,
                                    mode: 'insensitive',
                                },
                            },
                            {
                                username: {
                                    contains: query,
                                    mode: 'insensitive',
                                },
                            },
                        ],
                    },
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        image: true,
                        bio: true,
                        location: true,
                        createdAt: true,
                        email: false, // Don't expose email in search
                        updatedAt: false,
                    },
                    take: Math.min(limit, 50), // Max 50 results
                    skip: offset,
                    orderBy: {
                        name: 'asc',
                    },
                });
                return users;
            }
            catch (error) {
                console.error('Error searching users:', error);
                throw error;
            }
        });
    }
    /**
     * Get user's public profile
     */
    getPublicProfile(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield database_1.prisma.user.findUnique({
                    where: { id: userId },
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        image: true,
                        bio: true,
                        location: true,
                        createdAt: true,
                        // Don't expose sensitive information
                        email: false,
                        emailVerified: false,
                        onboardingCompleted: false,
                    },
                });
                return user;
            }
            catch (error) {
                console.error('Error getting public profile:', error);
                throw error;
            }
        });
    }
    /**
     * Check if username is available
     */
    checkUsernameAvailability(username, excludeUserId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const existingUser = yield database_1.prisma.user.findUnique({
                    where: { username: username.toLowerCase() },
                    select: { id: true },
                });
                // If no user found, username is available
                if (!existingUser)
                    return true;
                // If user found but it's the current user, username is available
                if (excludeUserId && existingUser.id === excludeUserId)
                    return true;
                // Username is taken
                return false;
            }
            catch (error) {
                console.error('Error checking username availability:', error);
                throw error;
            }
        });
    }
    /**
     * Complete welcome profile (first-time setup)
     */
    completeWelcomeProfile(userId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Validate input data
                if (!data.name.trim()) {
                    throw new errors_1.ValidationError('Name is required');
                }
                if (!data.username.trim()) {
                    throw new errors_1.ValidationError('Username is required');
                }
                // Validate username format
                const usernameRegex = /^[a-z0-9_]+$/;
                if (!usernameRegex.test(data.username)) {
                    throw new errors_1.ValidationError('Username can only contain lowercase letters, numbers, and underscores');
                }
                if (data.username.length < 3 || data.username.length > 30) {
                    throw new errors_1.ValidationError('Username must be between 3 and 30 characters');
                }
                // Check if username is available
                const isUsernameAvailable = yield this.checkUsernameAvailability(data.username, userId);
                if (!isUsernameAvailable) {
                    throw new errors_1.ValidationError('Username is already taken');
                }
                // Check if user exists
                const existingUser = yield database_1.prisma.user.findUnique({
                    where: { id: userId },
                });
                if (!existingUser) {
                    throw new errors_1.NotFoundError('User not found');
                }
                // Update user profile with welcome data
                const updatedUser = yield database_1.prisma.user.update({
                    where: { id: userId },
                    data: {
                        name: data.name.trim(),
                        username: data.username.toLowerCase(),
                        onboardingCompleted: true,
                        updatedAt: new Date(),
                    },
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        name: true,
                        image: true,
                        bio: true,
                        location: true,
                        onboardingCompleted: true,
                        emailVerified: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                });
                console.log('Welcome profile completed for user:', userId);
                return updatedUser;
            }
            catch (error) {
                console.error('Error completing welcome profile:', error);
                throw error;
            }
        });
    }
}
// Export service instance
exports.userService = new UserService();
