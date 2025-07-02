"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("passport"));
const zod_1 = require("zod");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const rateLimit_1 = require("../middleware/rateLimit");
const validation_2 = require("../utils/validation");
/**
 * Authentication Routes
 * Following implementation rules for route organization
 */
const router = (0, express_1.Router)();
// ============================================================================
// Google OAuth Routes (Primary Authentication Method)
// ============================================================================
/**
 * Initiate Google OAuth
 * GET /api/auth/google
 */
router.get('/google', rateLimit_1.authLimiter, passport_1.default.authenticate('google', { scope: ['profile', 'email'] }));
/**
 * Google OAuth callback
 * GET /api/auth/google/callback
 */
router.get('/google/callback', rateLimit_1.authLimiter, passport_1.default.authenticate('google', { failureRedirect: '/auth/error' }), authController_1.authController.googleCallback);
/**
 * Google OAuth for mobile apps (React Native)
 * POST /api/auth/google/mobile
 */
router.post('/google/mobile', rateLimit_1.authLimiter, (0, validation_1.validateBody)(zod_1.z.object({
    accessToken: zod_1.z.string().min(1, 'Google access token is required')
})), authController_1.authController.googleMobileAuth);
// ============================================================================
// Core Authentication Routes
// ============================================================================
/**
 * Get current user information
 * GET /api/auth/me
 */
router.get('/me', auth_1.authenticate, authController_1.authController.getMe);
/**
 * Refresh access token
 * POST /api/auth/refresh
 */
router.post('/refresh', rateLimit_1.authLimiter, (0, validation_1.validateBody)(validation_2.refreshTokenSchema), authController_1.authController.refreshToken);
/**
 * Logout user
 * POST /api/auth/logout
 */
router.post('/logout', authController_1.authController.logout);
/**
 * Logout from all devices
 * POST /api/auth/logout-all
 */
router.post('/logout-all', auth_1.authenticate, authController_1.authController.logoutAll);
/**
 * Complete user onboarding
 * POST /api/auth/onboarding
 */
router.post('/onboarding', auth_1.authenticate, authController_1.authController.completeOnboarding);
/**
 * Check username availability
 * GET /api/auth/check-username/:username
 */
router.get('/check-username/:username', authController_1.authController.checkUsername);
// ============================================================================
// Traditional Authentication Routes (Deprecated - Use Google OAuth)
// ============================================================================
/**
 * Register user (deprecated)
 * POST /api/auth/register
 */
router.post('/register', rateLimit_1.authLimiter, (0, validation_1.validateBody)(validation_2.registerSchema), authController_1.authController.register);
/**
 * Login user (deprecated)
 * POST /api/auth/login
 */
router.post('/login', rateLimit_1.authLimiter, (0, validation_1.validateBody)(validation_2.loginSchema), authController_1.authController.login);
/**
 * Forgot password
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', rateLimit_1.passwordResetLimiter, (0, validation_1.validateBody)(validation_2.forgotPasswordSchema), authController_1.authController.forgotPassword);
/**
 * Reset password
 * POST /api/auth/reset-password
 */
router.post('/reset-password', rateLimit_1.passwordResetLimiter, (0, validation_1.validateBody)(validation_2.resetPasswordSchema), authController_1.authController.resetPassword);
/**
 * Change password
 * POST /api/auth/change-password
 */
router.post('/change-password', auth_1.authenticate, (0, validation_1.validateBody)(validation_2.changePasswordSchema), authController_1.authController.changePassword);
/**
 * Verify email
 * GET /api/auth/verify-email/:token
 */
router.get('/verify-email/:token', authController_1.authController.verifyEmail);
/**
 * Authentication error handler (for OAuth failures)
 * GET /api/auth/error
 */
router.get('/error', (req, res) => {
    res.status(401).json({
        success: false,
        error: {
            code: 'OAUTH_ERROR',
            message: 'Authentication failed',
            statusCode: 401,
        },
    });
});
exports.default = router;
