import { redisManager } from '../config/redis';
import { User } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env';

/**
 * Session Management Service using Redis
 * Handles user sessions, token management, and session cleanup
 */

export interface SessionData {
  userId: string;
  accessToken: string;
  refreshToken: string;
  createdAt: number;
  lastAccessed: number;
  userAgent?: string;
  ipAddress?: string;
  deviceInfo?: {
    type: string;
    os: string;
    browser: string;
  };
}

export interface ActiveSession {
  sessionId: string;
  userId: string;
  createdAt: number;
  lastAccessed: number;
  userAgent?: string;
  ipAddress?: string;
  deviceInfo?: {
    type: string;
    os: string;
    browser: string;
  };
  isCurrent?: boolean;
}

export class SessionService {
  private static instance: SessionService;
  private readonly env = getEnv();
  
  // Session TTL configurations (in seconds)
  private readonly SESSION_TTL = 14 * 24 * 60 * 60; // 14 days
  private readonly REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60; // 30 days
  private readonly MAX_SESSIONS_PER_USER = 5; // Maximum concurrent sessions per user

  private constructor() {}

  public static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
    }
    return SessionService.instance;
  }

  // ============================================================================
  // Session Creation and Management
  // ============================================================================

  /**
   * Create a new session for a user
   */
  async createSession(
    user: User,
    accessToken: string,
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<string> {
    try {
      const sessionId = this.generateSessionId();
      const now = Date.now();
      
      const sessionData: SessionData = {
        userId: user.id,
        accessToken,
        refreshToken,
        createdAt: now,
        lastAccessed: now,
        userAgent,
        ipAddress,
        deviceInfo: this.parseUserAgent(userAgent),
      };

      // Store session in Redis
      const success = await redisManager.setSession(sessionId, sessionData);
      
      if (!success) {
        throw new Error('Failed to create session in Redis');
      }

      // Add session to user's active sessions list
      await this.addToUserSessions(user.id, sessionId);

      // Clean up old sessions if user has too many
      await this.cleanupOldSessions(user.id);

      console.log(`✅ Session created for user ${user.id}: ${sessionId}`);
      return sessionId;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Get session data
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      return await redisManager.getSession(sessionId);
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * Update session with new tokens
   */
  async updateSessionTokens(
    sessionId: string,
    accessToken: string,
    refreshToken: string
  ): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return false;
      }

      session.accessToken = accessToken;
      session.refreshToken = refreshToken;
      session.lastAccessed = Date.now();

      return await redisManager.setSession(sessionId, session);
    } catch (error) {
      console.error('Error updating session tokens:', error);
      return false;
    }
  }

  /**
   * Refresh session TTL
   */
  async refreshSession(sessionId: string): Promise<boolean> {
    try {
      return await redisManager.refreshSession(sessionId);
    } catch (error) {
      console.error('Error refreshing session:', error);
      return false;
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      // Get session to find user ID
      const session = await this.getSession(sessionId);
      if (!session) {
        return false;
      }

      // Remove from user's active sessions
      await this.removeFromUserSessions(session.userId, sessionId);

      // Delete from Redis
      const success = await redisManager.deleteSession(sessionId);
      
      if (success) {
        console.log(`✅ Session deleted: ${sessionId}`);
      }
      
      return success;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  }

  /**
   * Delete all sessions for a user
   */
  async deleteAllUserSessions(userId: string): Promise<boolean> {
    try {
      const activeSessions = await this.getUserActiveSessions(userId);
      
      const deletePromises = activeSessions.map(session => 
        redisManager.deleteSession(session.sessionId)
      );
      
      await Promise.all(deletePromises);
      
      // Clear user's active sessions list
      await redisManager.del(`user:${userId}:sessions`, 'session');
      
      console.log(`✅ All sessions deleted for user: ${userId}`);
      return true;
    } catch (error) {
      console.error('Error deleting all user sessions:', error);
      return false;
    }
  }

  /**
   * Validate session and return user data
   */
  async validateSession(sessionId: string): Promise<{ valid: boolean; userId?: string; session?: SessionData }> {
    try {
      const session = await this.getSession(sessionId);
      
      if (!session) {
        return { valid: false };
      }

      // Check if session is expired (additional check)
      const now = Date.now();
      const sessionAge = now - session.createdAt;
      
      if (sessionAge > this.SESSION_TTL * 1000) {
        await this.deleteSession(sessionId);
        return { valid: false };
      }

      // Update last accessed time
      session.lastAccessed = now;
      await redisManager.setSession(sessionId, session);

      return { valid: true, userId: session.userId, session };
    } catch (error) {
      console.error('Error validating session:', error);
      return { valid: false };
    }
  }

  // ============================================================================
  // User Session Management
  // ============================================================================

  /**
   * Get all active sessions for a user
   */
  async getUserActiveSessions(userId: string): Promise<ActiveSession[]> {
    try {
      const sessionIds = await redisManager.get<string[]>(`user:${userId}:sessions`, {
        prefix: 'session',
      });

      if (!sessionIds || sessionIds.length === 0) {
        return [];
      }

      const sessionPromises = sessionIds.map(async (sessionId) => {
        const session = await this.getSession(sessionId);
        if (!session) {
          return null;
        }

        return {
          sessionId,
          userId: session.userId,
          createdAt: session.createdAt,
          lastAccessed: session.lastAccessed,
          userAgent: session.userAgent,
          ipAddress: session.ipAddress,
          deviceInfo: session.deviceInfo,
        };
      });

      const sessions = await Promise.all(sessionPromises);
      return sessions.filter((session): session is ActiveSession => session !== null);
    } catch (error) {
      console.error('Error getting user active sessions:', error);
      return [];
    }
  }

  /**
   * Get user's current session (most recently accessed)
   */
  async getUserCurrentSession(userId: string): Promise<ActiveSession | null> {
    try {
      const sessions = await this.getUserActiveSessions(userId);
      
      if (sessions.length === 0) {
        return null;
      }

      // Sort by last accessed time (most recent first)
      sessions.sort((a, b) => b.lastAccessed - a.lastAccessed);
      
      const currentSession = sessions[0];
      currentSession.isCurrent = true;
      
      return currentSession;
    } catch (error) {
      console.error('Error getting user current session:', error);
      return null;
    }
  }

  /**
   * Add session to user's active sessions list
   */
  private async addToUserSessions(userId: string, sessionId: string): Promise<void> {
    try {
      let sessionIds = await redisManager.get<string[]>(`user:${userId}:sessions`, {
        prefix: 'session',
      }) || [];

      // Add new session
      sessionIds.push(sessionId);

      // Keep only unique sessions
      sessionIds = [...new Set(sessionIds)];

      await redisManager.set(`user:${userId}:sessions`, sessionIds, {
        ttl: this.SESSION_TTL,
        prefix: 'session',
      });
    } catch (error) {
      console.error('Error adding to user sessions:', error);
    }
  }

  /**
   * Remove session from user's active sessions list
   */
  private async removeFromUserSessions(userId: string, sessionId: string): Promise<void> {
    try {
      let sessionIds = await redisManager.get<string[]>(`user:${userId}:sessions`, {
        prefix: 'session',
      }) || [];

      // Remove session
      sessionIds = sessionIds.filter(id => id !== sessionId);

      if (sessionIds.length === 0) {
        await redisManager.del(`user:${userId}:sessions`, 'session');
      } else {
        await redisManager.set(`user:${userId}:sessions`, sessionIds, {
          ttl: this.SESSION_TTL,
          prefix: 'session',
        });
      }
    } catch (error) {
      console.error('Error removing from user sessions:', error);
    }
  }

  /**
   * Clean up old sessions if user has too many
   */
  private async cleanupOldSessions(userId: string): Promise<void> {
    try {
      const sessions = await this.getUserActiveSessions(userId);
      
      if (sessions.length <= this.MAX_SESSIONS_PER_USER) {
        return;
      }

      // Sort by last accessed time (oldest first)
      sessions.sort((a, b) => a.lastAccessed - b.lastAccessed);

      // Remove oldest sessions
      const sessionsToRemove = sessions.slice(0, sessions.length - this.MAX_SESSIONS_PER_USER);
      
      for (const session of sessionsToRemove) {
        await this.deleteSession(session.sessionId);
      }

      console.log(`🧹 Cleaned up ${sessionsToRemove.length} old sessions for user ${userId}`);
    } catch (error) {
      console.error('Error cleaning up old sessions:', error);
    }
  }

  // ============================================================================
  // Token Management
  // ============================================================================

  /**
   * Verify and decode JWT token
   */
  verifyToken(token: string): { valid: boolean; payload?: any } {
    try {
      const payload = jwt.verify(token, this.env.JWT_SECRET);
      return { valid: true, payload };
    } catch (error) {
      return { valid: false };
    }
  }

  /**
   * Generate new access token
   */
  generateAccessToken(userId: string): string {
    return jwt.sign(
      { userId, type: 'access' },
      this.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
  }

  /**
   * Generate new refresh token
   */
  generateRefreshToken(userId: string): string {
    return jwt.sign(
      { userId, type: 'refresh' },
      this.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    success: boolean;
    accessToken?: string;
    newRefreshToken?: string;
    userId?: string;
  }> {
    try {
      // Verify refresh token
      const { valid, payload } = this.verifyToken(refreshToken);
      
      if (!valid || payload.type !== 'refresh') {
        return { success: false };
      }

      const userId = payload.userId;

      // Find session with this refresh token
      const userSession = await redisManager.getUserSession(userId);
      
      if (!userSession || userSession.refreshToken !== refreshToken) {
        return { success: false };
      }

      // Generate new tokens
      const newAccessToken = this.generateAccessToken(userId);
      const newRefreshToken = this.generateRefreshToken(userId);

      // Update session with new tokens
      const sessionId = await redisManager.get<string>(`user:${userId}`, {
        prefix: 'session',
        serialize: false,
      });

      if (sessionId) {
        await this.updateSessionTokens(sessionId, newAccessToken, newRefreshToken);
      }

      return {
        success: true,
        accessToken: newAccessToken,
        newRefreshToken,
        userId,
      };
    } catch (error) {
      console.error('Error refreshing access token:', error);
      return { success: false };
    }
  }

  // ============================================================================
  // Session Analytics and Monitoring
  // ============================================================================

  /**
   * Get session statistics for a user
   */
  async getUserSessionStats(userId: string): Promise<{
    totalSessions: number;
    activeSessions: number;
    lastLoginTime: number;
    mostUsedDevice?: string;
    mostUsedLocation?: string;
  }> {
    try {
      const activeSessions = await this.getUserActiveSessions(userId);
      
      const stats = {
        totalSessions: activeSessions.length,
        activeSessions: activeSessions.length,
        lastLoginTime: Math.max(...activeSessions.map(s => s.lastAccessed)),
        mostUsedDevice: this.getMostUsedDevice(activeSessions),
        mostUsedLocation: this.getMostUsedLocation(activeSessions),
      };

      return stats;
    } catch (error) {
      console.error('Error getting user session stats:', error);
      return {
        totalSessions: 0,
        activeSessions: 0,
        lastLoginTime: 0,
      };
    }
  }

  /**
   * Get global session statistics
   */
  async getGlobalSessionStats(): Promise<{
    totalActiveSessions: number;
    totalActiveUsers: number;
    averageSessionsPerUser: number;
  }> {
    try {
      // This would require scanning Redis keys, which is expensive
      // In production, you'd want to maintain counters
      const stats = await redisManager.getCacheStats();
      
      return {
        totalActiveSessions: 0, // Would need to implement counter
        totalActiveUsers: 0,    // Would need to implement counter
        averageSessionsPerUser: 0,
      };
    } catch (error) {
      console.error('Error getting global session stats:', error);
      return {
        totalActiveSessions: 0,
        totalActiveUsers: 0,
        averageSessionsPerUser: 0,
      };
    }
  }

  // ============================================================================
  // Session Cleanup and Maintenance
  // ============================================================================

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      // This would require scanning Redis keys, which is expensive
      // In production, you'd want to use Redis key expiration
      console.log('🧹 Cleaning up expired sessions...');
      
      // Redis automatically handles expiration, so we just need to clean up orphaned references
      let cleanedCount = 0;
      
      // This is a simplified cleanup - in production you'd want a more sophisticated approach
      console.log(`✅ Cleaned up ${cleanedCount} expired sessions`);
      
      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
      return 0;
    }
  }

  /**
   * Invalidate sessions by criteria
   */
  async invalidateSessionsByCriteria(criteria: {
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    olderThan?: number;
  }): Promise<number> {
    try {
      let invalidatedCount = 0;
      
      if (criteria.userId) {
        const sessions = await this.getUserActiveSessions(criteria.userId);
        
        for (const session of sessions) {
          let shouldInvalidate = false;
          
          if (criteria.ipAddress && session.ipAddress === criteria.ipAddress) {
            shouldInvalidate = true;
          }
          
          if (criteria.userAgent && session.userAgent === criteria.userAgent) {
            shouldInvalidate = true;
          }
          
          if (criteria.olderThan && session.createdAt < criteria.olderThan) {
            shouldInvalidate = true;
          }
          
          if (shouldInvalidate) {
            await this.deleteSession(session.sessionId);
            invalidatedCount++;
          }
        }
      }
      
      console.log(`🔒 Invalidated ${invalidatedCount} sessions by criteria`);
      return invalidatedCount;
    } catch (error) {
      console.error('Error invalidating sessions by criteria:', error);
      return 0;
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    return `session_${timestamp}_${random}`;
  }

  /**
   * Parse user agent string to extract device info
   */
  private parseUserAgent(userAgent?: string): { type: string; os: string; browser: string } | undefined {
    if (!userAgent) return undefined;

    // Simple user agent parsing - in production, use a proper library
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    const isTablet = /iPad|Tablet/.test(userAgent);
    
    let deviceType = 'desktop';
    if (isTablet) deviceType = 'tablet';
    else if (isMobile) deviceType = 'mobile';

    let os = 'unknown';
    if (/Windows/.test(userAgent)) os = 'Windows';
    else if (/Mac/.test(userAgent)) os = 'macOS';
    else if (/Linux/.test(userAgent)) os = 'Linux';
    else if (/Android/.test(userAgent)) os = 'Android';
    else if (/iPhone|iPad/.test(userAgent)) os = 'iOS';

    let browser = 'unknown';
    if (/Chrome/.test(userAgent)) browser = 'Chrome';
    else if (/Firefox/.test(userAgent)) browser = 'Firefox';
    else if (/Safari/.test(userAgent)) browser = 'Safari';
    else if (/Edge/.test(userAgent)) browser = 'Edge';

    return { type: deviceType, os, browser };
  }

  /**
   * Get most used device from sessions
   */
  private getMostUsedDevice(sessions: ActiveSession[]): string | undefined {
    const deviceCounts: { [key: string]: number } = {};
    
    sessions.forEach(session => {
      if (session.deviceInfo?.type) {
        deviceCounts[session.deviceInfo.type] = (deviceCounts[session.deviceInfo.type] || 0) + 1;
      }
    });

    return Object.keys(deviceCounts).reduce((a, b) => 
      deviceCounts[a] > deviceCounts[b] ? a : b
    );
  }

  /**
   * Get most used location from sessions
   */
  private getMostUsedLocation(sessions: ActiveSession[]): string | undefined {
    const locationCounts: { [key: string]: number } = {};
    
    sessions.forEach(session => {
      if (session.ipAddress) {
        locationCounts[session.ipAddress] = (locationCounts[session.ipAddress] || 0) + 1;
      }
    });

    return Object.keys(locationCounts).reduce((a, b) => 
      locationCounts[a] > locationCounts[b] ? a : b
    );
  }
}

// Export singleton instance
export const sessionService = SessionService.getInstance(); 