import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authenticate } from '../middleware/auth';
import { validateRequest, validateBody } from '../middleware/validation';
import { apiLimiter } from '../middleware/rateLimit';
import { updateProfileSchema, welcomeProfileSchema } from '../utils/validation';

/**
 * User Routes
 * Following implementation rules for route organization
 */
const router = Router();

// Apply rate limiting to all user routes
router.use(apiLimiter);

/**
 * Get user profile
 * GET /api/users/profile
 */
router.get('/profile', authenticate, userController.getProfile);

/**
 * Update user profile
 * PUT /api/users/profile
 */
router.put(
  '/profile',
  authenticate,
  validateBody(updateProfileSchema),
  userController.updateProfile
);

/**
 * Test endpoint - no middleware
 * GET /api/users/test-search
 */
router.get('/test-search', async (req, res) => {
  try {
    res.json({
      success: true,
      data: [
        {
          id: 'test-id',
          name: 'Test User',
          username: 'testuser',
          email: 'test@example.com'
        }
      ],
      message: 'Test search working'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Test failed',
        statusCode: 500
      }
    });
  }
});

/**
 * Search users
 * GET /api/users/search
 */
router.get('/search', userController.searchUsers);

/**
 * Get user by ID
 * GET /api/users/:id
 */
router.get('/:id', authenticate, userController.getUserById);

/**
 * Check username availability
 * GET /api/users/check-username/:username
 */
router.get('/check-username/:username', userController.checkUsernameAvailability);

/**
 * Complete welcome profile (first-time setup)
 * POST /api/users/complete-welcome
 */
router.post(
  '/complete-welcome',
  authenticate,
  validateBody(welcomeProfileSchema),
  userController.completeWelcomeProfile
);

export default router; 