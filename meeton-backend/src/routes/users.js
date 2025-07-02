"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const rateLimit_1 = require("../middleware/rateLimit");
const validation_2 = require("../utils/validation");
/**
 * User Routes
 * Following implementation rules for route organization
 */
const router = (0, express_1.Router)();
// Apply rate limiting to all user routes
router.use(rateLimit_1.apiLimiter);
/**
 * Get user profile
 * GET /api/users/profile
 */
router.get('/profile', auth_1.authenticate, userController_1.userController.getProfile);
/**
 * Update user profile
 * PUT /api/users/profile
 */
router.put('/profile', auth_1.authenticate, (0, validation_1.validateBody)(validation_2.updateProfileSchema), userController_1.userController.updateProfile);
/**
 * Get user by ID
 * GET /api/users/:id
 */
router.get('/:id', auth_1.authenticate, userController_1.userController.getUserById);
/**
 * Search users
 * GET /api/users/search
 */
router.get('/search', auth_1.authenticate, userController_1.userController.searchUsers);
/**
 * Check username availability
 * GET /api/users/check-username/:username
 */
router.get('/check-username/:username', userController_1.userController.checkUsernameAvailability);
/**
 * Complete welcome profile (first-time setup)
 * POST /api/users/complete-welcome
 */
router.post('/complete-welcome', auth_1.authenticate, (0, validation_1.validateBody)(validation_2.welcomeProfileSchema), userController_1.userController.completeWelcomeProfile);
exports.default = router;
