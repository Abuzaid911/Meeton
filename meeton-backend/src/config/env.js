"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnv = exports.validateEnvironment = void 0;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    // Database
    DATABASE_URL: zod_1.z.string().url('Invalid DATABASE_URL format'),
    // JWT
    JWT_SECRET: zod_1.z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    JWT_ACCESS_EXPIRY: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRY: zod_1.z.string().default('7d'),
    // Session
    SESSION_SECRET: zod_1.z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
    // Server
    PORT: zod_1.z.string().regex(/^\d+$/, 'PORT must be a number').transform(Number).default('3000'),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    // Redis
    REDIS_URL: zod_1.z.string().url('Invalid REDIS_URL format').optional(),
    // Cloudinary
    CLOUDINARY_CLOUD_NAME: zod_1.z.string().optional(),
    CLOUDINARY_API_KEY: zod_1.z.string().optional(),
    CLOUDINARY_API_SECRET: zod_1.z.string().optional(),
    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: zod_1.z.string().regex(/^\d+$/).transform(Number).default('900000'),
    RATE_LIMIT_MAX_REQUESTS: zod_1.z.string().regex(/^\d+$/).transform(Number).default('100'),
    // CORS
    CORS_ORIGIN: zod_1.z.string().default('http://localhost:19006'),
    // Email (optional)
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASS: zod_1.z.string().optional(),
    // Push Notifications (optional)
    FCM_SERVER_KEY: zod_1.z.string().optional(),
    // Social Auth (Google OAuth required for login)
    GOOGLE_CLIENT_ID: zod_1.z.string().min(1, 'Google Client ID is required'),
    GOOGLE_CLIENT_SECRET: zod_1.z.string().min(1, 'Google Client Secret is required'),
    GOOGLE_CALLBACK_URL: zod_1.z.string().url('Invalid Google callback URL').default('http://localhost:3000/api/auth/google/callback'),
    // Apple Auth (optional)
    APPLE_CLIENT_ID: zod_1.z.string().optional(),
    APPLE_TEAM_ID: zod_1.z.string().optional(),
    APPLE_KEY_ID: zod_1.z.string().optional(),
    APPLE_PRIVATE_KEY: zod_1.z.string().optional(),
});
let env;
const validateEnvironment = () => {
    try {
        env = envSchema.parse(process.env);
        console.log('✅ Environment variables validated successfully');
        return env;
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            console.error('❌ Environment validation failed:');
            error.errors.forEach((err) => {
                console.error(`  - ${err.path.join('.')}: ${err.message}`);
            });
        }
        else {
            console.error('❌ Environment validation error:', error);
        }
        process.exit(1);
    }
};
exports.validateEnvironment = validateEnvironment;
const getEnv = () => {
    if (!env) {
        env = (0, exports.validateEnvironment)();
    }
    return env;
};
exports.getEnv = getEnv;
exports.default = exports.getEnv;
