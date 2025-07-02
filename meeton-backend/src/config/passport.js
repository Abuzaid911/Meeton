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
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const database_1 = require("./database");
const env_1 = require("./env");
/**
 * Passport.js configuration for Google OAuth
 * Following implementation rules for authentication
 */
class PassportConfig {
    /**
     * Initialize Passport.js with Google OAuth strategy
     */
    static initialize() {
        const env = (0, env_1.getEnv)();
        // Google OAuth Strategy
        passport_1.default.use(new passport_google_oauth20_1.Strategy({
            clientID: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            callbackURL: env.GOOGLE_CALLBACK_URL,
            scope: ['profile', 'email'],
        }, this.googleVerifyCallback));
        // Serialize user for session (not used with JWT but required by Passport)
        passport_1.default.serializeUser((user, done) => {
            done(null, user.id);
        });
        // Deserialize user from session (not used with JWT but required by Passport)
        passport_1.default.deserializeUser((id, done) => __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield database_1.prisma.user.findUnique({
                    where: { id },
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        name: true,
                        image: true,
                        onboardingCompleted: true,
                    },
                });
                done(null, user);
            }
            catch (error) {
                done(error, null);
            }
        }));
    }
    /**
     * Google OAuth verification callback
     * Handles user creation or login after Google authentication
     */
    static googleVerifyCallback(accessToken, refreshToken, profile, done) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            try {
                const googleProfile = {
                    id: profile.id,
                    email: ((_b = (_a = profile.emails) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value) || '',
                    name: profile.displayName || '',
                    picture: ((_d = (_c = profile.photos) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.value) || '',
                    given_name: (_e = profile.name) === null || _e === void 0 ? void 0 : _e.givenName,
                    family_name: (_f = profile.name) === null || _f === void 0 ? void 0 : _f.familyName,
                    verified_email: ((_h = (_g = profile.emails) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.verified) || false,
                };
                // Validate required fields
                if (!googleProfile.email) {
                    return done(new Error('Email not provided by Google'), null);
                }
                // Check if user already exists
                let user = yield database_1.prisma.user.findFirst({
                    where: {
                        OR: [
                            { email: googleProfile.email },
                            { googleId: googleProfile.id },
                        ],
                    },
                });
                if (user) {
                    // User exists - update Google ID if not set and update last active
                    if (!user.googleId) {
                        user = yield database_1.prisma.user.update({
                            where: { id: user.id },
                            data: Object.assign({ googleId: googleProfile.id, lastActive: new Date() }, ((!user.image || user.image.includes('ui-avatars.com')) && {
                                image: googleProfile.picture
                            })),
                        });
                    }
                    else {
                        // Just update last active
                        user = yield database_1.prisma.user.update({
                            where: { id: user.id },
                            data: { lastActive: new Date() },
                        });
                    }
                    return done(null, user);
                }
                // Create new user from Google profile
                const username = yield PassportConfig.generateUniqueUsername(googleProfile.email, googleProfile.name);
                user = yield database_1.prisma.user.create({
                    data: {
                        email: googleProfile.email,
                        name: googleProfile.name,
                        username,
                        googleId: googleProfile.id,
                        image: googleProfile.picture,
                        emailVerified: googleProfile.verified_email ? new Date() : null,
                        onboardingCompleted: false, // User will need to complete onboarding
                        interests: [], // Will be set during onboarding
                    },
                });
                return done(null, user);
            }
            catch (error) {
                console.error('Google OAuth error:', error);
                return done(error, null);
            }
        });
    }
    /**
     * Generate a unique username from email and name
     */
    static generateUniqueUsername(email, name) {
        return __awaiter(this, void 0, void 0, function* () {
            // Start with email prefix or sanitized name
            let baseUsername = email.split('@')[0].toLowerCase();
            // If baseUsername is too short, use name
            if (baseUsername.length < 3) {
                baseUsername = name.toLowerCase().replace(/[^a-z0-9]/g, '');
            }
            // Ensure minimum length
            if (baseUsername.length < 3) {
                baseUsername = 'user';
            }
            // Sanitize username (only lowercase letters, numbers, underscores)
            baseUsername = baseUsername.replace(/[^a-z0-9_]/g, '').substring(0, 25);
            let username = baseUsername;
            let counter = 1;
            // Check for uniqueness and add number if needed
            while (yield database_1.prisma.user.findUnique({ where: { username } })) {
                username = `${baseUsername}${counter}`;
                counter++;
                // Prevent infinite loop
                if (counter > 9999) {
                    username = `${baseUsername}_${Date.now()}`;
                    break;
                }
            }
            return username;
        });
    }
    /**
     * Create a user session object for JWT
     */
    static createUserSession(user) {
        return {
            id: user.id,
            email: user.email || '',
            username: user.username,
            name: user.name || undefined,
            image: user.image || undefined,
            onboardingCompleted: user.onboardingCompleted,
        };
    }
}
exports.default = PassportConfig;
