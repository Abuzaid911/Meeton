import passport from 'passport';
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from 'passport-google-oauth20';
import { prisma } from './database';
import { getEnv } from './env';
import { User } from '@prisma/client';

/**
 * Google OAuth Profile Interface
 */
interface GoogleUserProfile {
  id: string;
  email: string;
  name: string;
  picture: string;
  given_name?: string;
  family_name?: string;
  verified_email?: boolean;
}

/**
 * Passport.js configuration for Google OAuth
 * Following implementation rules for authentication
 */
class PassportConfig {
  
  /**
   * Initialize Passport.js with Google OAuth strategy
   */
  static initialize(): void {
    const env = getEnv();

    // Google OAuth Strategy
    passport.use(new GoogleStrategy({
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL,
      scope: ['profile', 'email'],
    }, this.googleVerifyCallback));

    // Serialize user for session (not used with JWT but required by Passport)
    passport.serializeUser((user: any, done) => {
      done(null, user.id);
    });

    // Deserialize user from session (not used with JWT but required by Passport)
    passport.deserializeUser(async (id: string, done) => {
      try {
        const user = await prisma.user.findUnique({
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
      } catch (error) {
        done(error, null);
      }
    });
  }

  /**
   * Google OAuth verification callback
   * Handles user creation or login after Google authentication
   */
  private static async googleVerifyCallback(
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile,
    done: (error: any, user?: any) => void
  ): Promise<void> {
    try {
      const googleProfile: GoogleUserProfile = {
        id: profile.id,
        email: profile.emails?.[0]?.value || '',
        name: profile.displayName || '',
        picture: profile.photos?.[0]?.value || '',
        given_name: profile.name?.givenName,
        family_name: profile.name?.familyName,
        verified_email: profile.emails?.[0]?.verified || false,
      };

      // Validate required fields
      if (!googleProfile.email) {
        return done(new Error('Email not provided by Google'), null);
      }

      // Check if user already exists
      let user = await prisma.user.findFirst({
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
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              googleId: googleProfile.id,
              lastActive: new Date(),
              // Update image if not set or if it's the default avatar
              ...((!user.image || user.image.includes('ui-avatars.com')) && { 
                image: googleProfile.picture 
              }),
            },
          });
        } else {
          // Just update last active
          user = await prisma.user.update({
            where: { id: user.id },
            data: { lastActive: new Date() },
          });
        }

        return done(null, user);
      }

      // Create new user from Google profile
      const username = await PassportConfig.generateUniqueUsername(googleProfile.email, googleProfile.name);
      
      user = await prisma.user.create({
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
    } catch (error) {
      console.error('Google OAuth error:', error);
      return done(error, null);
    }
  }

  /**
   * Generate a unique username from email and name
   */
  private static async generateUniqueUsername(email: string, name: string): Promise<string> {
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
    while (await prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${counter}`;
      counter++;
      
      // Prevent infinite loop
      if (counter > 9999) {
        username = `${baseUsername}_${Date.now()}`;
        break;
      }
    }

    return username;
  }

  /**
   * Create a user session object for JWT
   */
  static createUserSession(user: User): {
    id: string;
    email: string;
    username: string;
    name?: string;
    image?: string;
    onboardingCompleted: boolean;
  } {
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

export default PassportConfig; 