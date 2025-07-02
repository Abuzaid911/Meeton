"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordValidationSchema = exports.resetPasswordValidationSchema = exports.forgotPasswordValidationSchema = exports.refreshTokenValidationSchema = exports.loginValidationSchema = exports.registerValidationSchema = exports.uploadImageSchema = exports.getUsersSchema = exports.searchEventsSchema = exports.paginationSchema = exports.reactToCommentSchema = exports.updateCommentSchema = exports.createCommentSchema = exports.respondToFriendRequestSchema = exports.sendFriendRequestSchema = exports.rsvpSchema = exports.updateEventSchema = exports.createEventSchema = exports.onboardingSchema = exports.updateNotificationSettingsSchema = exports.updatePrivacySettingsSchema = exports.welcomeProfileSchema = exports.updateProfileSchema = exports.changePasswordSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.refreshTokenSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// Authentication Schemas
// ============================================================================
exports.registerSchema = zod_1.z.object({
    name: zod_1.z.string()
        .min(1, 'Name is required')
        .max(100, 'Name must be less than 100 characters')
        .trim(),
    email: zod_1.z.string()
        .email('Invalid email format')
        .toLowerCase()
        .trim(),
    password: zod_1.z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must be less than 128 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    username: zod_1.z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(30, 'Username must be less than 30 characters')
        .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores')
        .toLowerCase()
        .trim(),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string()
        .email('Invalid email format')
        .toLowerCase()
        .trim(),
    password: zod_1.z.string()
        .min(1, 'Password is required'),
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string()
        .min(1, 'Refresh token is required'),
});
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string()
        .email('Invalid email format')
        .toLowerCase()
        .trim(),
});
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string()
        .min(1, 'Reset token is required'),
    password: zod_1.z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must be less than 128 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
});
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string()
        .min(1, 'Current password is required'),
    newPassword: zod_1.z.string()
        .min(8, 'New password must be at least 8 characters')
        .max(128, 'New password must be less than 128 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'New password must contain at least one lowercase letter, one uppercase letter, and one number'),
});
// ============================================================================
// User Profile Schemas
// ============================================================================
exports.updateProfileSchema = zod_1.z.object({
    name: zod_1.z.string()
        .min(1, 'Name is required')
        .max(100, 'Name must be less than 100 characters')
        .trim()
        .optional(),
    bio: zod_1.z.string()
        .max(500, 'Bio must be less than 500 characters')
        .trim()
        .optional(),
    location: zod_1.z.string()
        .max(100, 'Location must be less than 100 characters')
        .trim()
        .optional(),
});
exports.welcomeProfileSchema = zod_1.z.object({
    name: zod_1.z.string()
        .min(1, 'Name is required')
        .max(100, 'Name cannot exceed 100 characters'),
    username: zod_1.z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(30, 'Username cannot exceed 30 characters')
        .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores'),
});
exports.updatePrivacySettingsSchema = zod_1.z.object({
    profileVisibility: zod_1.z.enum(['PUBLIC', 'FRIENDS_ONLY', 'PRIVATE']),
    allowFriendRequests: zod_1.z.boolean(),
    showOnlineStatus: zod_1.z.boolean(),
});
exports.updateNotificationSettingsSchema = zod_1.z.object({
    pushNotifications: zod_1.z.boolean(),
    emailNotifications: zod_1.z.boolean(),
    smsNotifications: zod_1.z.boolean(),
});
// ============================================================================
// Onboarding Schema
// ============================================================================
exports.onboardingSchema = zod_1.z.object({
    body: zod_1.z.object({
        interests: zod_1.z.array(zod_1.z.string().trim().min(1).max(50))
            .max(20, 'Maximum 20 interests allowed')
            .optional(),
        bio: zod_1.z.string()
            .max(500, 'Bio must be less than 500 characters')
            .trim()
            .optional(),
        location: zod_1.z.string()
            .max(100, 'Location must be less than 100 characters')
            .trim()
            .optional(),
        dateOfBirth: zod_1.z.string()
            .datetime()
            .optional(),
    }),
});
// ============================================================================
// Event Schemas
// ============================================================================
exports.createEventSchema = zod_1.z.object({
    name: zod_1.z.string()
        .min(1, 'Event name is required')
        .max(200, 'Event name must be less than 200 characters')
        .trim(),
    date: zod_1.z.string()
        .datetime()
        .or(zod_1.z.date()),
    time: zod_1.z.string()
        .min(1, 'Event time is required')
        .max(50, 'Time must be less than 50 characters')
        .trim(),
    location: zod_1.z.string()
        .min(1, 'Location is required')
        .max(500, 'Location must be less than 500 characters')
        .trim(),
    lat: zod_1.z.number()
        .min(-90, 'Invalid latitude')
        .max(90, 'Invalid latitude')
        .optional(),
    lng: zod_1.z.number()
        .min(-180, 'Invalid longitude')
        .max(180, 'Invalid longitude')
        .optional(),
    description: zod_1.z.string()
        .max(2000, 'Description must be less than 2000 characters')
        .trim()
        .optional(),
    duration: zod_1.z.number()
        .min(15, 'Event duration must be at least 15 minutes')
        .max(10080, 'Event duration cannot exceed 7 days'), // 7 days in minutes
    capacity: zod_1.z.number()
        .min(1, 'Capacity must be at least 1')
        .max(10000, 'Capacity cannot exceed 10,000')
        .optional(),
    rsvpDeadline: zod_1.z.string()
        .datetime()
        .optional()
        .or(zod_1.z.date().optional()),
    headerType: zod_1.z.enum(['color', 'image']).optional(),
    headerColor: zod_1.z.string()
        .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format')
        .optional(),
    headerImageUrl: zod_1.z.string()
        .url('Invalid image URL')
        .optional(),
    category: zod_1.z.string()
        .max(100, 'Category must be less than 100 characters')
        .trim()
        .optional(),
    tags: zod_1.z.array(zod_1.z.string().trim().min(1).max(50))
        .max(10, 'Maximum 10 tags allowed')
        .optional(),
    privacyLevel: zod_1.z.enum(['PUBLIC', 'FRIENDS_ONLY', 'PRIVATE']).default('PUBLIC'),
    ticketPrice: zod_1.z.number()
        .min(0, 'Ticket price cannot be negative')
        .optional(),
    externalUrl: zod_1.z.string()
        .url('Invalid external URL')
        .optional(),
});
exports.updateEventSchema = exports.createEventSchema.partial();
exports.rsvpSchema = zod_1.z.object({
    rsvp: zod_1.z.enum(['YES', 'MAYBE', 'NO']),
});
// ============================================================================
// Friend Request Schemas
// ============================================================================
exports.sendFriendRequestSchema = zod_1.z.object({
    receiverId: zod_1.z.string()
        .min(1, 'Receiver ID is required'),
});
exports.respondToFriendRequestSchema = zod_1.z.object({
    status: zod_1.z.enum(['ACCEPTED', 'DECLINED']),
    declineReason: zod_1.z.string()
        .max(200, 'Decline reason must be less than 200 characters')
        .trim()
        .optional(),
});
// ============================================================================
// Comment Schemas
// ============================================================================
exports.createCommentSchema = zod_1.z.object({
    text: zod_1.z.string()
        .min(1, 'Comment text is required')
        .max(1000, 'Comment must be less than 1000 characters')
        .trim(),
    mentions: zod_1.z.array(zod_1.z.string())
        .max(10, 'Maximum 10 mentions allowed')
        .optional(),
});
exports.updateCommentSchema = zod_1.z.object({
    text: zod_1.z.string()
        .min(1, 'Comment text is required')
        .max(1000, 'Comment must be less than 1000 characters')
        .trim(),
});
exports.reactToCommentSchema = zod_1.z.object({
    reactionType: zod_1.z.enum(['like', 'love', 'laugh', 'wow', 'sad', 'angry']),
});
// ============================================================================
// Pagination and Query Schemas
// ============================================================================
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.string()
        .regex(/^\d+$/, 'Page must be a number')
        .transform(Number)
        .refine(val => val >= 1, 'Page must be at least 1')
        .optional()
        .default('1'),
    limit: zod_1.z.string()
        .regex(/^\d+$/, 'Limit must be a number')
        .transform(Number)
        .refine(val => val >= 1 && val <= 100, 'Limit must be between 1 and 100')
        .optional()
        .default('20'),
});
exports.searchEventsSchema = exports.paginationSchema.extend({
    query: zod_1.z.string()
        .max(100, 'Search query must be less than 100 characters')
        .trim()
        .optional(),
    category: zod_1.z.string()
        .max(100, 'Category must be less than 100 characters')
        .trim()
        .optional(),
    location: zod_1.z.string()
        .max(100, 'Location must be less than 100 characters')
        .trim()
        .optional(),
    startDate: zod_1.z.string()
        .datetime()
        .optional(),
    endDate: zod_1.z.string()
        .datetime()
        .optional(),
    privacyLevel: zod_1.z.enum(['PUBLIC', 'FRIENDS_ONLY', 'PRIVATE']).optional(),
});
exports.getUsersSchema = exports.paginationSchema.extend({
    query: zod_1.z.string()
        .max(100, 'Search query must be less than 100 characters')
        .trim()
        .optional(),
    location: zod_1.z.string()
        .max(100, 'Location must be less than 100 characters')
        .trim()
        .optional(),
});
// ============================================================================
// File Upload Schemas
// ============================================================================
exports.uploadImageSchema = zod_1.z.object({
    type: zod_1.z.enum(['profile', 'event', 'photo']),
    file: zod_1.z.any(), // Will be validated by multer middleware
});
// ============================================================================
// Validation Middleware Schemas (wrapped for middleware)
// ============================================================================
exports.registerValidationSchema = zod_1.z.object({
    body: exports.registerSchema,
});
exports.loginValidationSchema = zod_1.z.object({
    body: exports.loginSchema,
});
exports.refreshTokenValidationSchema = zod_1.z.object({
    body: exports.refreshTokenSchema,
});
exports.forgotPasswordValidationSchema = zod_1.z.object({
    body: exports.forgotPasswordSchema,
});
exports.resetPasswordValidationSchema = zod_1.z.object({
    body: exports.resetPasswordSchema,
});
exports.changePasswordValidationSchema = zod_1.z.object({
    body: exports.changePasswordSchema,
});
