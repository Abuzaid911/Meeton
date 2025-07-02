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
exports.authService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const database_1 = require("../config/database");
const env_1 = require("../config/env");
const errors_1 = require("../utils/errors");
/**
 * Authentication Service - ALL business logic MUST be in service layers
 * Handles user registration, login, token refresh, logout, and Google OAuth
 */
class AuthService {
    constructor() {
        this.saltRounds = 12;
    }
    /**
     * Generate JWT access token
     */
    generateAccessToken(user) {
        const env = (0, env_1.getEnv)();
        const payload = {
            userId: user.id,
            email: user.email,
            username: user.username,
            name: user.name,
        };
        return jsonwebtoken_1.default.sign(payload, env.JWT_SECRET, {
            expiresIn: env.JWT_ACCESS_EXPIRY,
            issuer: 'meeton-api',
            audience: 'meeton-app',
        });
    }
    /**
     * Generate JWT refresh token
     */
    generateRefreshToken() {
        const env = (0, env_1.getEnv)();
        return jsonwebtoken_1.default.sign({ type: 'refresh', timestamp: Date.now() }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRY });
    }
    /**
     * Get token expiration time in seconds
     */
    getTokenExpirationTime() {
        const env = (0, env_1.getEnv)();
        // Convert expiry string to seconds (assuming format like "15m", "1h", etc.)
        const expiryString = env.JWT_ACCESS_EXPIRY;
        const timeValue = parseInt(expiryString);
        const timeUnit = expiryString.slice(-1);
        switch (timeUnit) {
            case 's':
                return timeValue;
            case 'm':
                return timeValue * 60;
            case 'h':
                return timeValue * 60 * 60;
            case 'd':
                return timeValue * 24 * 60 * 60;
            default:
                return 15 * 60; // Default to 15 minutes
        }
    }
    /**
     * Store refresh token in database
     */
    storeRefreshToken(userId, refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const env = (0, env_1.getEnv)();
            const expiresAt = new Date();
            // Calculate refresh token expiration (assuming 7d format)
            const refreshExpiryString = env.JWT_REFRESH_EXPIRY;
            const timeValue = parseInt(refreshExpiryString);
            const timeUnit = refreshExpiryString.slice(-1);
            switch (timeUnit) {
                case 'd':
                    expiresAt.setDate(expiresAt.getDate() + timeValue);
                    break;
                case 'h':
                    expiresAt.setHours(expiresAt.getHours() + timeValue);
                    break;
                default:
                    expiresAt.setDate(expiresAt.getDate() + 7); // Default to 7 days
            }
            // Store refresh token
            yield database_1.prisma.refreshToken.create({
                data: {
                    token: refreshToken,
                    userId,
                    expiresAt,
                },
            });
            // Clean up expired tokens for this user
            yield database_1.prisma.refreshToken.deleteMany({
                where: {
                    userId,
                    expiresAt: { lt: new Date() },
                },
            });
        });
    }
    /**
     * Create token response for user (used by both traditional and OAuth login)
     */
    createTokenResponse(user) {
        return __awaiter(this, void 0, void 0, function* () {
            // Generate tokens
            const accessToken = this.generateAccessToken(user);
            const refreshToken = this.generateRefreshToken();
            // Store refresh token
            yield this.storeRefreshToken(user.id, refreshToken);
            return {
                accessToken,
                refreshToken,
                expiresIn: this.getTokenExpirationTime(),
                user: {
                    id: user.id,
                    email: user.email || '',
                    username: user.username,
                    name: user.name || undefined,
                    image: user.image || undefined,
                    onboardingCompleted: user.onboardingCompleted,
                },
            };
        });
    }
    /**
     * Handle Google OAuth login/registration
     * Called after successful Google authentication
     */
    handleGoogleAuth(user) {
        return __awaiter(this, void 0, void 0, function* () {
            // Update last active time
            yield database_1.prisma.user.update({
                where: { id: user.id },
                data: { lastActive: new Date() },
            });
            // Create and return token response
            return this.createTokenResponse(user);
        });
    }
    /**
     * Register a new user (traditional email/password - deprecated in favor of Google OAuth)
     */
    register(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if user already exists
            const existingUser = yield database_1.prisma.user.findFirst({
                where: {
                    OR: [
                        { email: data.email },
                        { username: data.username },
                    ],
                },
            });
            if (existingUser) {
                if (existingUser.email === data.email) {
                    throw new errors_1.ConflictError('An account with this email already exists');
                }
                if (existingUser.username === data.username) {
                    throw new errors_1.ConflictError('This username is already taken');
                }
            }
            // Hash password
            const passwordHash = yield bcryptjs_1.default.hash(data.password, this.saltRounds);
            // Create user
            const user = yield database_1.prisma.user.create({
                data: {
                    name: data.name,
                    email: data.email,
                    username: data.username,
                    passwordHash,
                    onboardingCompleted: false,
                    // Generate a default avatar
                    image: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=667eea&color=fff&size=150`,
                },
            });
            return this.createTokenResponse(user);
        });
    }
    /**
     * Login user (traditional email/password - deprecated in favor of Google OAuth)
     */
    login(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Find user by email
            const user = yield database_1.prisma.user.findUnique({
                where: { email: data.email },
            });
            if (!user || !user.passwordHash) {
                throw new errors_1.AuthenticationError('Invalid email or password');
            }
            // Verify password
            const isPasswordValid = yield bcryptjs_1.default.compare(data.password, user.passwordHash);
            if (!isPasswordValid) {
                throw new errors_1.AuthenticationError('Invalid email or password');
            }
            // Update last active
            yield database_1.prisma.user.update({
                where: { id: user.id },
                data: { lastActive: new Date() },
            });
            return this.createTokenResponse(user);
        });
    }
    /**
     * Refresh access token
     */
    refreshToken(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const env = (0, env_1.getEnv)();
            // Verify refresh token
            let payload;
            try {
                payload = jsonwebtoken_1.default.verify(data.refreshToken, env.JWT_REFRESH_SECRET);
            }
            catch (error) {
                throw new errors_1.AuthenticationError('Invalid refresh token');
            }
            // Check if refresh token exists in database
            const storedToken = yield database_1.prisma.refreshToken.findUnique({
                where: { token: data.refreshToken },
                include: { user: true },
            });
            if (!storedToken) {
                throw new errors_1.AuthenticationError('Refresh token not found');
            }
            if (storedToken.expiresAt < new Date()) {
                // Clean up expired token
                yield database_1.prisma.refreshToken.delete({
                    where: { id: storedToken.id },
                });
                throw new errors_1.AuthenticationError('Refresh token expired');
            }
            const user = storedToken.user;
            // Generate new tokens
            const accessToken = this.generateAccessToken(user);
            const newRefreshToken = this.generateRefreshToken();
            // Replace old refresh token with new one (token rotation)
            yield database_1.prisma.$transaction([
                database_1.prisma.refreshToken.delete({
                    where: { id: storedToken.id },
                }),
                database_1.prisma.refreshToken.create({
                    data: {
                        token: newRefreshToken,
                        userId: user.id,
                        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                    },
                }),
            ]);
            // Update last active
            yield database_1.prisma.user.update({
                where: { id: user.id },
                data: { lastActive: new Date() },
            });
            return {
                accessToken,
                refreshToken: newRefreshToken,
                expiresIn: this.getTokenExpirationTime(),
                user: {
                    id: user.id,
                    email: user.email || '',
                    username: user.username,
                    name: user.name || undefined,
                    image: user.image || undefined,
                    onboardingCompleted: user.onboardingCompleted,
                },
            };
        });
    }
    /**
     * Logout user
     */
    logout(refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            // Delete refresh token from database
            yield database_1.prisma.refreshToken.deleteMany({
                where: { token: refreshToken },
            });
        });
    }
    /**
     * Logout from all devices
     */
    logoutAll(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Delete all refresh tokens for user
            yield database_1.prisma.refreshToken.deleteMany({
                where: { userId },
            });
        });
    }
    /**
     * Generate password reset token
     */
    generatePasswordResetToken(email) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield database_1.prisma.user.findUnique({
                where: { email },
            });
            if (!user) {
                // Don't reveal if email exists or not
                throw new errors_1.NotFoundError('If this email is registered, you will receive reset instructions');
            }
            // Generate secure random token
            const token = crypto_1.default.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
            // Store reset token
            yield database_1.prisma.user.update({
                where: { id: user.id },
                data: {
                    resetPasswordToken: token,
                    resetPasswordExpires: expiresAt,
                },
            });
            return { token, expiresAt };
        });
    }
    /**
     * Reset password using token
     */
    resetPassword(token, newPassword) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield database_1.prisma.user.findFirst({
                where: {
                    resetPasswordToken: token,
                    resetPasswordExpires: { gt: new Date() },
                },
            });
            if (!user) {
                throw new errors_1.AuthenticationError('Invalid or expired reset token');
            }
            // Hash new password
            const passwordHash = yield bcryptjs_1.default.hash(newPassword, this.saltRounds);
            // Update password and clear reset token
            yield database_1.prisma.user.update({
                where: { id: user.id },
                data: {
                    passwordHash,
                    resetPasswordToken: null,
                    resetPasswordExpires: null,
                },
            });
            // Logout from all devices
            yield this.logoutAll(user.id);
        });
    }
    /**
     * Change password (requires current password)
     */
    changePassword(userId, currentPassword, newPassword) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const user = yield database_1.prisma.user.findUnique({
                where: { id: userId },
            });
            if (!user || !user.passwordHash) {
                throw new errors_1.NotFoundError('User not found');
            }
            // Verify current password
            const isCurrentPasswordValid = yield bcryptjs_1.default.compare(currentPassword, user.passwordHash);
            if (!isCurrentPasswordValid) {
                throw new errors_1.AuthenticationError('Current password is incorrect');
            }
            // Hash new password
            const passwordHash = yield bcryptjs_1.default.hash(newPassword, this.saltRounds);
            // Update password
            yield database_1.prisma.user.update({
                where: { id: userId },
                data: { passwordHash },
            });
            // Logout from all other devices (keep current session)
            const activeTokens = yield database_1.prisma.refreshToken.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 1, // Keep most recent token (current session)
            });
            const tokenToKeep = (_a = activeTokens[0]) === null || _a === void 0 ? void 0 : _a.token;
            yield database_1.prisma.refreshToken.deleteMany({
                where: Object.assign({ userId }, (tokenToKeep && { token: { not: tokenToKeep } })),
            });
        });
    }
    /**
     * Verify email using token
     */
    verifyEmail(token) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield database_1.prisma.user.findFirst({
                where: { emailVerificationToken: token },
            });
            if (!user) {
                throw new errors_1.AuthenticationError('Invalid verification token');
            }
            yield database_1.prisma.user.update({
                where: { id: user.id },
                data: {
                    emailVerified: new Date(),
                    emailVerificationToken: null,
                },
            });
        });
    }
    /**
     * Generate email verification token
     */
    generateEmailVerificationToken(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const token = crypto_1.default.randomBytes(32).toString('hex');
            yield database_1.prisma.user.update({
                where: { id: userId },
                data: { emailVerificationToken: token },
            });
            return token;
        });
    }
    /**
     * Complete user onboarding
     */
    completeOnboarding(userId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield database_1.prisma.user.update({
                where: { id: userId },
                data: Object.assign(Object.assign({}, data), { onboardingCompleted: true }),
            });
            return user;
        });
    }
    /**
     * Get user by ID
     */
    getUserById(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return database_1.prisma.user.findUnique({
                where: { id: userId },
            });
        });
    }
    /**
     * Check if username is available
     */
    isUsernameAvailable(username, excludeUserId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield database_1.prisma.user.findUnique({
                where: { username },
            });
            if (!user)
                return true;
            if (excludeUserId && user.id === excludeUserId)
                return true;
            return false;
        });
    }
}
// Export singleton instance
exports.authService = new AuthService();
