import { z } from 'zod';

// ============================================================================
// Authentication Schemas
// ============================================================================

export const registerSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores')
    .toLowerCase()
    .trim(),
});

export const loginSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string()
    .min(1, 'Refresh token is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .trim(),
});

export const resetPasswordSchema = z.object({
  token: z.string()
    .min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string()
    .min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'New password must be at least 8 characters')
    .max(128, 'New password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'New password must contain at least one lowercase letter, one uppercase letter, and one number'),
});

// ============================================================================
// User Profile Schemas
// ============================================================================

export const updateProfileSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .optional(),
  bio: z.string()
    .max(500, 'Bio must be less than 500 characters')
    .trim()
    .optional(),
  location: z.string()
    .max(100, 'Location must be less than 100 characters')
    .trim()
    .optional(),
});

export const welcomeProfileSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name cannot exceed 100 characters'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores'),
});

export const updatePrivacySettingsSchema = z.object({
  profileVisibility: z.enum(['PUBLIC', 'FRIENDS_ONLY', 'PRIVATE']),
  allowFriendRequests: z.boolean(),
  showOnlineStatus: z.boolean(),
});

export const updateNotificationSettingsSchema = z.object({
  pushNotifications: z.boolean(),
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
});

// ============================================================================
// Onboarding Schema
// ============================================================================

export const onboardingSchema = z.object({
  body: z.object({
    interests: z.array(z.string().trim().min(1).max(50))
      .max(20, 'Maximum 20 interests allowed')
      .optional(),
    bio: z.string()
      .max(500, 'Bio must be less than 500 characters')
      .trim()
      .optional(),
    location: z.string()
      .max(100, 'Location must be less than 100 characters')
      .trim()
      .optional(),
    dateOfBirth: z.string()
      .datetime()
      .optional(),
  }),
});

// ============================================================================
// Event Schemas
// ============================================================================

export const createEventSchema = z.object({
  name: z.string()
    .min(1, 'Event name is required')
    .max(200, 'Event name must be less than 200 characters')
    .trim(),
  date: z.string()
    .datetime()
    .or(z.date()),
  time: z.string()
    .min(1, 'Event time is required')
    .max(50, 'Time must be less than 50 characters')
    .trim(),
  location: z.string()
    .min(1, 'Location is required')
    .max(500, 'Location must be less than 500 characters')
    .trim(),
  lat: z.number()
    .min(-90, 'Invalid latitude')
    .max(90, 'Invalid latitude')
    .optional(),
  lng: z.number()
    .min(-180, 'Invalid longitude')
    .max(180, 'Invalid longitude')
    .optional(),
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .trim()
    .optional(),
  duration: z.number()
    .min(15, 'Event duration must be at least 15 minutes')
    .max(10080, 'Event duration cannot exceed 7 days'), // 7 days in minutes
  capacity: z.number()
    .min(1, 'Capacity must be at least 1')
    .max(10000, 'Capacity cannot exceed 10,000')
    .optional(),
  rsvpDeadline: z.string()
    .datetime()
    .optional()
    .or(z.date().optional()),
  headerType: z.enum(['color', 'image']).optional(),
  headerColor: z.string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format')
    .optional(),
  headerImageUrl: z.string()
    .url('Invalid image URL')
    .optional(),
  category: z.string()
    .max(100, 'Category must be less than 100 characters')
    .trim()
    .optional(),
  tags: z.array(z.string().trim().min(1).max(50))
    .max(10, 'Maximum 10 tags allowed')
    .optional(),
  privacyLevel: z.enum(['PUBLIC', 'FRIENDS_ONLY', 'PRIVATE']).default('PUBLIC'),
  ticketPrice: z.number()
    .min(0, 'Ticket price cannot be negative')
    .optional(),
  externalUrl: z.string()
    .url('Invalid external URL')
    .optional(),
});

export const updateEventSchema = createEventSchema.partial();

export const rsvpSchema = z.object({
  rsvp: z.enum(['YES', 'MAYBE', 'NO']),
});

// ============================================================================
// Friend Request Schemas
// ============================================================================

export const sendFriendRequestSchema = z.object({
  receiverId: z.string()
    .min(1, 'Receiver ID is required'),
});

export const respondToFriendRequestSchema = z.object({
  requestId: z.string()
    .min(1, 'Request ID is required'),
  action: z.enum(['ACCEPTED', 'DECLINED']),
  declineReason: z.string()
    .max(200, 'Decline reason must be less than 200 characters')
    .trim()
    .optional(),
});

// ============================================================================
// Comment Schemas
// ============================================================================

export const createCommentSchema = z.object({
  text: z.string()
    .min(1, 'Comment text is required')
    .max(1000, 'Comment must be less than 1000 characters')
    .trim(),
  mentions: z.array(z.string())
    .max(10, 'Maximum 10 mentions allowed')
    .optional(),
});

export const updateCommentSchema = z.object({
  text: z.string()
    .min(1, 'Comment text is required')
    .max(1000, 'Comment must be less than 1000 characters')
    .trim(),
});

export const reactToCommentSchema = z.object({
  reactionType: z.enum(['like', 'love', 'laugh', 'wow', 'sad', 'angry']),
});

// ============================================================================
// Pagination and Query Schemas
// ============================================================================

export const paginationSchema = z.object({
  page: z.string()
    .regex(/^\d+$/, 'Page must be a number')
    .transform(Number)
    .refine(val => val >= 1, 'Page must be at least 1')
    .optional()
    .default('1'),
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(Number)
    .refine(val => val >= 1 && val <= 100, 'Limit must be between 1 and 100')
    .optional()
    .default('20'),
});

export const searchEventsSchema = paginationSchema.extend({
  query: z.string()
    .max(100, 'Search query must be less than 100 characters')
    .trim()
    .optional(),
  category: z.string()
    .max(100, 'Category must be less than 100 characters')
    .trim()
    .optional(),
  location: z.string()
    .max(100, 'Location must be less than 100 characters')
    .trim()
    .optional(),
  startDate: z.string()
    .datetime()
    .optional(),
  endDate: z.string()
    .datetime()
    .optional(),
  privacyLevel: z.enum(['PUBLIC', 'FRIENDS_ONLY', 'PRIVATE']).optional(),
});

export const getUsersSchema = paginationSchema.extend({
  query: z.string()
    .max(100, 'Search query must be less than 100 characters')
    .trim()
    .optional(),
  location: z.string()
    .max(100, 'Location must be less than 100 characters')
    .trim()
    .optional(),
});

// ============================================================================
// File Upload Schemas
// ============================================================================

export const uploadImageSchema = z.object({
  caption: z.string().max(500, 'Caption must be less than 500 characters').optional(),
});

export const imageParamsSchema = z.object({
  eventId: z.string().cuid('Invalid event ID').optional(),
  photoId: z.string().cuid('Invalid photo ID').optional(),
  publicId: z.string().min(1, 'Public ID is required').optional(),
});

export const imageQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

// ============================================================================
// Validation Middleware Schemas (wrapped for middleware)
// ============================================================================

export const registerValidationSchema = z.object({
  body: registerSchema,
});

export const loginValidationSchema = z.object({
  body: loginSchema,
});

export const refreshTokenValidationSchema = z.object({
  body: refreshTokenSchema,
});

export const forgotPasswordValidationSchema = z.object({
  body: forgotPasswordSchema,
});

export const resetPasswordValidationSchema = z.object({
  body: resetPasswordSchema,
});

export const changePasswordValidationSchema = z.object({
  body: changePasswordSchema,
});

// Export types for TypeScript inference
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type RSVPInput = z.infer<typeof rsvpSchema>;
export type SendFriendRequestInput = z.infer<typeof sendFriendRequestSchema>;
export type RespondToFriendRequestInput = z.infer<typeof respondToFriendRequestSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type SearchEventsInput = z.infer<typeof searchEventsSchema>; 
export type UploadImageInput = z.infer<typeof uploadImageSchema>;
export type ImageParamsInput = z.infer<typeof imageParamsSchema>;
export type ImageQueryInput = z.infer<typeof imageQuerySchema>; 