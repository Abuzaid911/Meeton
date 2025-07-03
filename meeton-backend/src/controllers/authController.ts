import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { AuthenticationError, ValidationError } from '../utils/errors';
import { authService } from '../services/authService';
import { verifyGoogleToken } from '../utils/googleTokenVerifier';
import type { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../middleware/errorHandler';
import { 
  NotFoundError 
} from '../utils/errors';
import { 
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema
} from '../utils/validation';
import { User } from '@prisma/client';
import { prisma } from '../config/database';

/**
 * Authentication Controller - Controllers ONLY handle HTTP concerns
 * Following strict controller pattern from implementation rules
 */
class AuthController {
  
  constructor() {
    // Bind all methods to preserve 'this' context
    this.googleAuth = this.googleAuth.bind(this);
    this.googleCallback = this.googleCallback.bind(this);
    this.googleMobileAuth = this.googleMobileAuth.bind(this);
    this.getMe = this.getMe.bind(this);
    this.refreshToken = this.refreshToken.bind(this);
    this.logout = this.logout.bind(this);
    this.logoutAll = this.logoutAll.bind(this);
    this.completeOnboarding = this.completeOnboarding.bind(this);
    this.checkUsername = this.checkUsername.bind(this);
    this.register = this.register.bind(this);
    this.login = this.login.bind(this);
    this.forgotPassword = this.forgotPassword.bind(this);
    this.resetPassword = this.resetPassword.bind(this);
    this.changePassword = this.changePassword.bind(this);
    this.verifyEmail = this.verifyEmail.bind(this);
    // verifyGoogleToken is now static, no binding needed
    this.findOrCreateGoogleUser = this.findOrCreateGoogleUser.bind(this);
    this.generateUniqueUsername = this.generateUniqueUsername.bind(this);
  }

  /**
   * Google OAuth initiation
   * GET /api/auth/google
   */
  async googleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    // This will be handled by Passport middleware
    // Redirects to Google OAuth consent screen
  }

  /**
   * Google OAuth callback
   * GET /api/auth/google/callback
   */
  async googleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as User;
      
      if (!user) {
        throw new AuthenticationError('Google authentication failed');
      }

      // Create JWT tokens for the authenticated user
      const tokenResponse = await authService.handleGoogleAuth(user);

      // For development: Show a success page with manual options
      const userInfo = {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        onboardingCompleted: user.onboardingCompleted
      };
      
      const deepLinkUrl = `meeton://auth/callback?token=${encodeURIComponent(tokenResponse.accessToken)}&refresh=${encodeURIComponent(tokenResponse.refreshToken)}&user=${encodeURIComponent(JSON.stringify(userInfo))}`;
      
      console.log('OAuth Success - User authenticated:', { email: user.email, name: user.name });
      
      // Create a success page that tries both automatic redirect and manual options
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>MeetOn - Login Success!</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 20px;
              padding: 40px;
              box-shadow: 0 25px 50px rgba(0,0,0,0.15);
              text-align: center;
              max-width: 500px;
              width: 100%;
              animation: slideIn 0.5s ease-out;
            }
            @keyframes slideIn {
              from { opacity: 0; transform: translateY(30px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .success-icon {
              font-size: 80px;
              margin-bottom: 20px;
              animation: bounceIn 0.6s ease-out 0.2s both;
            }
            @keyframes bounceIn {
              from { opacity: 0; transform: scale(0.3); }
              to { opacity: 1; transform: scale(1); }
            }
            h1 {
              color: #333;
              margin-bottom: 10px;
              font-size: 28px;
            }
            .user-info {
              background: #f8f9fa;
              border-radius: 12px;
              padding: 20px;
              margin: 20px 0;
              border-left: 4px solid #667eea;
            }
            .user-info h3 {
              color: #667eea;
              margin-bottom: 5px;
            }
            .user-info p {
              color: #666;
              font-size: 14px;
            }
            .buttons {
              margin-top: 30px;
              display: flex;
              flex-direction: column;
              gap: 15px;
            }
            .btn {
              padding: 15px 25px;
              border: none;
              border-radius: 12px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s ease;
              text-decoration: none;
              display: inline-block;
            }
            .btn-primary {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .btn-primary:hover {
              transform: translateY(-2px);
              box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
            }
            .btn-secondary {
              background: #f8f9fa;
              color: #667eea;
              border: 2px solid #667eea;
            }
            .btn-secondary:hover {
              background: #667eea;
              color: white;
            }
            .countdown {
              color: #888;
              font-size: 14px;
              margin-top: 20px;
            }
            .manual-instructions {
              background: #fff3e0;
              border: 1px solid #ffb74d;
              border-radius: 8px;
              padding: 15px;
              margin-top: 20px;
              text-align: left;
              font-size: 14px;
              color: #f57600;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">🎉</div>
            <h1>Login Successful!</h1>
            <p>Welcome back to MeetOn</p>
            
            <div class="user-info">
              <h3>Logged in as:</h3>
              <p><strong>${user.name || user.username}</strong></p>
              <p>${user.email}</p>
            </div>

            <div class="buttons">
              <a href="${deepLinkUrl}" class="btn btn-primary" onclick="attemptAppOpen()">
                📱 Return to MeetOn App
              </a>
              
              <button class="btn btn-secondary" onclick="copyTokens()">
                📋 Copy Tokens (Development)
              </button>
            </div>

            <div class="manual-instructions">
              <strong>Development Note:</strong><br>
              If the app doesn't open automatically, you can manually copy the authentication tokens using the button above and paste them in your development console.
            </div>

            <div class="countdown">
              <p>This page will try to redirect automatically in <span id="countdown">5</span> seconds</p>
            </div>
          </div>

          <script>
            const tokens = {
              accessToken: "${tokenResponse.accessToken}",
              refreshToken: "${tokenResponse.refreshToken}",
              user: ${JSON.stringify(userInfo)}
            };

            function attemptAppOpen() {
              console.log('Attempting to open app with deep link...');
              // Try to open the app
              window.location.href = "${deepLinkUrl}";
              
              // Fallback: Show instructions after a delay
              setTimeout(() => {
                alert('If the app didn\\'t open, please manually return to the MeetOn app. The authentication was successful.');
              }, 2000);
            }

            function copyTokens() {
              const tokenText = JSON.stringify(tokens, null, 2);
              navigator.clipboard.writeText(tokenText).then(() => {
                alert('Tokens copied to clipboard! You can paste them in your development console.');
              }).catch(() => {
                prompt('Copy these tokens:', tokenText);
              });
            }

            // Auto-redirect countdown
            let countdown = 5;
            const countdownElement = document.getElementById('countdown');
            
            const timer = setInterval(() => {
              countdown--;
              countdownElement.textContent = countdown;
              
              if (countdown <= 0) {
                clearInterval(timer);
                attemptAppOpen();
              }
            }, 1000);

            // Log success for development
            console.log('MeetOn OAuth Success:', tokens);
          </script>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get authentication status and user info
   * GET /api/auth/me
   */
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const user = await authService.getUserById(req.user.id);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const userResponse = {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        image: user.image,
        bio: user.bio,
        location: user.location,
        interests: user.interests,
        onboardingCompleted: user.onboardingCompleted,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      };

      sendSuccess(res, userResponse, 'User information retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body as RefreshTokenInput;
      
      const tokenResponse = await authService.refreshToken({ refreshToken });
      
      sendSuccess(res, tokenResponse, 'Token refreshed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout user
   * POST /api/auth/logout
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
      
      sendSuccess(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout from all devices
   * POST /api/auth/logout-all
   */
  async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      await authService.logoutAll(req.user.id);
      
      sendSuccess(res, null, 'Logged out from all devices');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Complete user onboarding
   * POST /api/auth/onboarding
   */
  async completeOnboarding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const { interests, bio, location, dateOfBirth } = req.body;
      
      const user = await authService.completeOnboarding(req.user.id, {
        interests,
        bio,
        location,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      });

      const userResponse = {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        image: user.image,
        bio: user.bio,
        location: user.location,
        interests: user.interests,
        onboardingCompleted: user.onboardingCompleted,
      };

      sendSuccess(res, userResponse, 'Onboarding completed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check username availability
   * GET /api/auth/check-username/:username
   */
  async checkUsername(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username } = req.params;
      const excludeUserId = req.user?.id;
      
      const isAvailable = await authService.isUsernameAvailable(username, excludeUserId);
      
      sendSuccess(res, { available: isAvailable }, 
        isAvailable ? 'Username is available' : 'Username is taken');
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // Traditional Auth Methods (Deprecated in favor of Google OAuth)
  // ============================================================================

  /**
   * Register user (deprecated - use Google OAuth)
   * POST /api/auth/register
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = req.body as RegisterInput;
      
      const tokenResponse = await authService.register(validatedData);
      
      sendSuccess(res, tokenResponse, 'User registered successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login user (deprecated - use Google OAuth)
   * POST /api/auth/login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = req.body as LoginInput;
      
      const tokenResponse = await authService.login(validatedData);
      
      sendSuccess(res, tokenResponse, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Forgot password
   * POST /api/auth/forgot-password
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      
      const { token } = await authService.generatePasswordResetToken(email);
      
      // In a real app, you would send this token via email
      // For now, we'll just return success (don't expose the token)
      
      sendSuccess(res, null, 'Password reset instructions sent to your email');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password
   * POST /api/auth/reset-password
   */
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, password } = req.body;
      
      await authService.resetPassword(token, password);
      
      sendSuccess(res, null, 'Password reset successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   * POST /api/auth/change-password
   */
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const { currentPassword, newPassword } = req.body;
      
      await authService.changePassword(req.user.id, currentPassword, newPassword);
      
      sendSuccess(res, null, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify email
   * GET /api/auth/verify-email/:token
   */
  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;
      
      await authService.verifyEmail(token);
      
      sendSuccess(res, null, 'Email verified successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Google OAuth for mobile apps
   * POST /api/auth/google/mobile
   */
  async googleMobileAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { accessToken } = req.body;
      
      if (!accessToken) {
        throw new ValidationError('Google access token is required');
      }

      // Verify Google access token
      const googleUser = await verifyGoogleToken(accessToken);
      
      // Find or create user in database
      const user = await this.findOrCreateGoogleUser(googleUser);

      // Generate JWT tokens using existing auth service
      const tokenResponse = await authService.handleGoogleAuth(user);

      sendSuccess(res, tokenResponse, 'Google authentication successful');

    } catch (error) {
      next(error);
    }
  }

  /**
   * Find or create user from Google OAuth data
   */
  private async findOrCreateGoogleUser(googleUser: any): Promise<User> {
    try {
      // Try to find existing user by Google ID or email
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { googleId: googleUser.sub || googleUser.id },
            { email: googleUser.email },
          ],
        },
      });

      if (user) {
        // Update existing user with latest Google info
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleUser.sub || googleUser.id,
            email: googleUser.email,
            name: googleUser.name || user.name,
            image: googleUser.picture || user.image,
            emailVerified: googleUser.email_verified || googleUser.verified_email ? new Date() : user.emailVerified,
            lastActive: new Date(),
          },
        });
      } else {
        // Create new user
        const username = await this.generateUniqueUsername(googleUser.email, googleUser.name);
        
        user = await prisma.user.create({
          data: {
            googleId: googleUser.sub || googleUser.id,
            email: googleUser.email,
            name: googleUser.name,
            username,
            image: googleUser.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(googleUser.name || username)}&background=667eea&color=fff&size=150`,
            emailVerified: googleUser.email_verified || googleUser.verified_email ? new Date() : null,
            onboardingCompleted: false,
            lastActive: new Date(),
          },
        });
      }

      return user;
    } catch (error) {
      console.error('Error finding/creating Google user:', error);
      throw new AuthenticationError('Failed to authenticate with Google');
    }
  }

  /**
   * Generate unique username from Google user data
   */
  private async generateUniqueUsername(email: string, name?: string): Promise<string> {
    // Try to use the name first
    if (name) {
      const baseUsername = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (baseUsername.length >= 3) {
        const isAvailable = await authService.isUsernameAvailable(baseUsername);
        if (isAvailable) {
          return baseUsername;
        }
      }
    }

    // Fallback to email-based username
    const emailBase = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    let username = emailBase;
    let counter = 1;

    // Keep trying until we find an available username
    while (!(await authService.isUsernameAvailable(username))) {
      username = `${emailBase}${counter}`;
      counter++;
    }

    return username;
  }
}

// Export controller instance
export const authController = new AuthController(); 