import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { getEnv } from '../config/env';
import { 
  AuthenticationError, 
  ValidationError, 
  ConflictError, 
  NotFoundError 
} from '../utils/errors';
import { 
  RegisterInput, 
  LoginInput, 
  RefreshTokenInput 
} from '../utils/validation';
import { User } from '../generated/prisma';

/**
 * JWT Token Response Interface
 */
interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    username: string;
    name?: string;
    image?: string;
    onboardingCompleted: boolean;
  };
}

/**
 * Authentication Service - ALL business logic MUST be in service layers
 * Handles user registration, login, token refresh, logout, and Google OAuth
 */
class AuthService {
  private readonly saltRounds = 12;

  /**
   * Generate JWT access token
   */
  private generateAccessToken(user: User): string {
    const env = getEnv();
    const payload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
    };

    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRY,
      issuer: 'meeton-api',
      audience: 'meeton-app',
    } as jwt.SignOptions);
  }

  /**
   * Generate JWT refresh token
   */
  private generateRefreshToken(): string {
    const env = getEnv();
    return jwt.sign(
      { type: 'refresh', timestamp: Date.now() },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRY } as jwt.SignOptions
    );
  }

  /**
   * Get token expiration time in seconds
   */
  private getTokenExpirationTime(): number {
    const env = getEnv();
    // Convert expiry string to seconds (assuming format like "15m", "1h", etc.)
    const expiryString = env.JWT_ACCESS_EXPIRY;
    const timeValue = parseInt(expiryString);
    const timeUnit = expiryString.slice(-1);
    
    switch (timeUnit) {
      case 's':
        return timeValue;
      case 'm':
        return timeValue * 60;
      case 'h':
        return timeValue * 60 * 60;
      case 'd':
        return timeValue * 24 * 60 * 60;
      default:
        return 15 * 60; // Default to 15 minutes
    }
  }

  /**
   * Store refresh token in database
   */
  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const env = getEnv();
    const expiresAt = new Date();
    
    // Calculate refresh token expiration (assuming 7d format)
    const refreshExpiryString = env.JWT_REFRESH_EXPIRY;
    const timeValue = parseInt(refreshExpiryString);
    const timeUnit = refreshExpiryString.slice(-1);
    
    switch (timeUnit) {
      case 'd':
        expiresAt.setDate(expiresAt.getDate() + timeValue);
        break;
      case 'h':
        expiresAt.setHours(expiresAt.getHours() + timeValue);
        break;
      default:
        expiresAt.setDate(expiresAt.getDate() + 7); // Default to 7 days
    }

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });

    // Clean up expired tokens for this user
    await prisma.refreshToken.deleteMany({
      where: {
        userId,
        expiresAt: { lt: new Date() },
      },
    });
  }

  /**
   * Create token response for user (used by both traditional and OAuth login)
   */
  async createTokenResponse(user: User): Promise<TokenResponse> {
    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken();

    // Store refresh token
    await this.storeRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.getTokenExpirationTime(),
      user: {
        id: user.id,
        email: user.email || '',
        username: user.username,
        name: user.name || undefined,
        image: user.image || undefined,
        onboardingCompleted: user.onboardingCompleted,
      },
    };
  }

  /**
   * Handle Google OAuth login/registration
   * Called after successful Google authentication
   */
  async handleGoogleAuth(user: User): Promise<TokenResponse> {
    // Update last active time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActive: new Date() },
    });

    // Create and return token response
    return this.createTokenResponse(user);
  }

  /**
   * Register a new user (traditional email/password - deprecated in favor of Google OAuth)
   */
  async register(data: RegisterInput): Promise<TokenResponse> {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { username: data.username },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email === data.email) {
        throw new ConflictError('An account with this email already exists');
      }
      if (existingUser.username === data.username) {
        throw new ConflictError('This username is already taken');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, this.saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        username: data.username,
        passwordHash,
        onboardingCompleted: false,
        // Generate a default avatar
        image: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=667eea&color=fff&size=150`,
      },
    });

    return this.createTokenResponse(user);
  }

  /**
   * Login user (traditional email/password - deprecated in favor of Google OAuth)
   */
  async login(data: LoginInput): Promise<TokenResponse> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user || !user.passwordHash) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Update last active
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActive: new Date() },
    });

    return this.createTokenResponse(user);
  }

  /**
   * Refresh access token
   */
  async refreshToken(data: RefreshTokenInput): Promise<TokenResponse> {
    const env = getEnv();

    // Verify refresh token
    let payload;
    try {
      payload = jwt.verify(data.refreshToken, env.JWT_REFRESH_SECRET);
    } catch (error) {
      throw new AuthenticationError('Invalid refresh token');
    }

    // Check if refresh token exists in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: data.refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new AuthenticationError('Refresh token not found');
    }

    if (storedToken.expiresAt < new Date()) {
      // Clean up expired token
      await prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
      throw new AuthenticationError('Refresh token expired');
    }

    const user = storedToken.user;

    // Generate new tokens
    const accessToken = this.generateAccessToken(user);
    const newRefreshToken = this.generateRefreshToken();

    // Replace old refresh token with new one (token rotation)
    await prisma.$transaction([
      prisma.refreshToken.delete({
        where: { id: storedToken.id },
      }),
      prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      }),
    ]);

    // Update last active
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActive: new Date() },
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: this.getTokenExpirationTime(),
      user: {
        id: user.id,
        email: user.email || '',
        username: user.username,
        name: user.name || undefined,
        image: user.image || undefined,
        onboardingCompleted: user.onboardingCompleted,
      },
    };
  }

  /**
   * Logout user
   */
  async logout(refreshToken: string): Promise<void> {
    // Delete refresh token from database
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId: string): Promise<void> {
    // Delete all refresh tokens for user
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(email: string): Promise<{ token: string; expiresAt: Date }> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists or not
      throw new NotFoundError('If this email is registered, you will receive reset instructions');
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: token,
        resetPasswordExpires: expiresAt,
      },
    });

    return { token, expiresAt };
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new AuthenticationError('Invalid or expired reset token');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, this.saltRounds);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    // Logout from all devices
    await this.logoutAll(user.id);
  }

  /**
   * Change password (requires current password)
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.passwordHash) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, this.saltRounds);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Logout from all other devices (keep current session)
    const activeTokens = await prisma.refreshToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 1, // Keep most recent token (current session)
    });

    const tokenToKeep = activeTokens[0]?.token;

    await prisma.refreshToken.deleteMany({
      where: {
        userId,
        ...(tokenToKeep && { token: { not: tokenToKeep } }),
      },
    });
  }

  /**
   * Verify email using token
   */
  async verifyEmail(token: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new AuthenticationError('Invalid verification token');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        emailVerificationToken: null,
      },
    });
  }

  /**
   * Generate email verification token
   */
  async generateEmailVerificationToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');

    await prisma.user.update({
      where: { id: userId },
      data: { emailVerificationToken: token },
    });

    return token;
  }

  /**
   * Complete user onboarding
   */
  async completeOnboarding(userId: string, data: {
    interests?: string[];
    bio?: string;
    location?: string;
    dateOfBirth?: Date;
  }): Promise<User> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        onboardingCompleted: true,
      },
    });

    return user;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id: userId },
    });
  }

  /**
   * Check if username is available
   */
  async isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) return true;
    if (excludeUserId && user.id === excludeUserId) return true;
    
    return false;
  }
}

// Export singleton instance
export const authService = new AuthService(); 