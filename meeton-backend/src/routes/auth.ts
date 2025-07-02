import { Router } from 'express';
import passport from 'passport';
import { z } from 'zod';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validateRequest, validateBody } from '../middleware/validation';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimit';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../utils/validation';

/**
 * Authentication Routes
 * Following implementation rules for route organization
 */
const router = Router();

// ============================================================================
// Google OAuth Routes (Primary Authentication Method)
// ============================================================================

/**
 * Initiate Google OAuth
 * GET /api/auth/google
 */
router.get(
  '/google',
  authLimiter,
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

/**
 * Google OAuth callback
 * GET /api/auth/google/callback
 */
router.get(
  '/google/callback',
  authLimiter,
  passport.authenticate('google', { failureRedirect: '/auth/error' }),
  authController.googleCallback
);

/**
 * Google OAuth for mobile apps (React Native)
 * POST /api/auth/google/mobile
 */
router.post(
  '/google/mobile',
  authLimiter,
  validateBody(z.object({
    accessToken: z.string().min(1, 'Google access token is required')
  })),
  authController.googleMobileAuth
);

// ============================================================================
// Core Authentication Routes
// ============================================================================

/**
 * Get current user information
 * GET /api/auth/me
 */
router.get('/me', authenticate, authController.getMe);

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
router.post(
  '/refresh',
  authLimiter,
  validateBody(refreshTokenSchema),
  authController.refreshToken
);

/**
 * Logout user
 * POST /api/auth/logout
 */
router.post('/logout', authController.logout);

/**
 * Logout from all devices
 * POST /api/auth/logout-all
 */
router.post('/logout-all', authenticate, authController.logoutAll);

/**
 * Complete user onboarding
 * POST /api/auth/onboarding
 */
router.post(
  '/onboarding',
  authenticate,
  authController.completeOnboarding
);

/**
 * Check username availability
 * GET /api/auth/check-username/:username
 */
router.get('/check-username/:username', authController.checkUsername);

// ============================================================================
// Traditional Authentication Routes (Deprecated - Use Google OAuth)
// ============================================================================

/**
 * Register user (deprecated)
 * POST /api/auth/register
 */
router.post(
  '/register',
  authLimiter,
  validateBody(registerSchema),
  authController.register
);

/**
 * Login user (deprecated)
 * POST /api/auth/login
 */
router.post(
  '/login',
  authLimiter,
  validateBody(loginSchema),
  authController.login
);

/**
 * Forgot password
 * POST /api/auth/forgot-password
 */
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword
);

/**
 * Reset password
 * POST /api/auth/reset-password
 */
router.post(
  '/reset-password',
  passwordResetLimiter,
  validateBody(resetPasswordSchema),
  authController.resetPassword
);

/**
 * Change password
 * POST /api/auth/change-password
 */
router.post(
  '/change-password',
  authenticate,
  validateBody(changePasswordSchema),
  authController.changePassword
);

/**
 * Verify email
 * GET /api/auth/verify-email/:token
 */
router.get('/verify-email/:token', authController.verifyEmail);

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

export default router; 