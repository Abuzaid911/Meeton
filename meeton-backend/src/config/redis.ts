import Redis from 'ioredis';

/**
 * Redis Configuration and Connection Manager
 * Handles Redis connections, caching, and session management
 */

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  retryDelayOnFailover: number;
  enableReadyCheck: boolean;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
}

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
  serialize?: boolean;
}

interface SessionData {
  userId: string;
  accessToken: string;
  refreshToken: string;
  createdAt: number;
  lastAccessed: number;
  userAgent?: string;
  ipAddress?: string;
}

export class RedisManager {
  private static instance: RedisManager;
  private redis: Redis;
  private isConnected: boolean = false;
  private readonly defaultTTL = 3600; // 1 hour default TTL
  private readonly sessionTTL = 86400 * 14; // 14 days for sessions

  private constructor() {
    this.redis = this.createRedisConnection();
    this.setupEventHandlers();
  }

  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  /**
   * Create Redis connection with configuration
   */
  private createRedisConnection(): Redis {
    // Check if REDIS_URL is provided (common in cloud platforms like Render)
    if (process.env.REDIS_URL) {
      console.log('🔗 Using REDIS_URL for connection');
      return new Redis(process.env.REDIS_URL);
    }

    // Fallback to individual environment variables
    const config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
    };

    console.log('🔗 Configuring Redis connection:', {
      host: config.host,
      port: config.port,
      db: config.db,
      hasPassword: !!config.password,
    });

    return new Redis(config);
  }

  /**
   * Setup Redis event handlers
   */
  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      console.log('🔗 Redis connecting...');
    });

    this.redis.on('ready', () => {
      console.log('✅ Redis connected and ready');
      this.isConnected = true;
    });

    this.redis.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
      this.isConnected = false;
    });

    this.redis.on('close', () => {
      console.log('🔌 Redis connection closed');
      this.isConnected = false;
    });

    this.redis.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    try {
      await this.redis.connect();
      console.log('✅ Redis connection established');
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      await this.redis.disconnect();
      console.log('✅ Redis disconnected gracefully');
    } catch (error) {
      console.error('❌ Error disconnecting from Redis:', error);
    }
  }

  /**
   * Check if Redis is connected
   */
  isHealthy(): boolean {
    return this.isConnected && this.redis.status === 'ready';
  }

  /**
   * Get Redis health status
   */
  async getHealthStatus(): Promise<{ status: string; latency?: number }> {
    try {
      if (!this.isHealthy()) {
        return { status: 'disconnected' };
      }

      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;

      return { status: 'healthy', latency };
    } catch (error) {
      return { status: 'error' };
    }
  }

  // ============================================================================
  // Caching Methods
  // ============================================================================

  /**
   * Set a value in cache
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    try {
      if (!this.isHealthy()) {
        console.warn('Redis not available, skipping cache set');
        return false;
      }

      const { ttl = this.defaultTTL, prefix = 'cache', serialize = true } = options;
      const fullKey = `${prefix}:${key}`;
      const serializedValue = serialize ? JSON.stringify(value) : value;

      if (ttl > 0) {
        await this.redis.setex(fullKey, ttl, serializedValue);
      } else {
        await this.redis.set(fullKey, serializedValue);
      }

      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      if (!this.isHealthy()) {
        return null;
      }

      const { prefix = 'cache', serialize = true } = options;
      const fullKey = `${prefix}:${key}`;
      const value = await this.redis.get(fullKey);

      if (value === null) {
        return null;
      }

      return serialize ? JSON.parse(value) : value;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  /**
   * Delete a value from cache
   */
  async del(key: string, prefix: string = 'cache'): Promise<boolean> {
    try {
      if (!this.isHealthy()) {
        return false;
      }

      const fullKey = `${prefix}:${key}`;
      const result = await this.redis.del(fullKey);
      return result > 0;
    } catch (error) {
      console.error('Redis delete error:', error);
      return false;
    }
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string, prefix: string = 'cache'): Promise<boolean> {
    try {
      if (!this.isHealthy()) {
        return false;
      }

      const fullKey = `${prefix}:${key}`;
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  /**
   * Set cache with automatic expiration refresh
   */
  async setWithRefresh(key: string, value: any, ttl: number = this.defaultTTL, prefix: string = 'cache'): Promise<boolean> {
    try {
      const success = await this.set(key, value, { ttl, prefix });
      if (success) {
        // Set a refresh marker at 80% of TTL
        const refreshTime = Math.floor(ttl * 0.8);
        await this.set(`${key}:refresh`, true, { ttl: refreshTime, prefix });
      }
      return success;
    } catch (error) {
      console.error('Redis setWithRefresh error:', error);
      return false;
    }
  }

  /**
   * Check if cache needs refresh
   */
  async needsRefresh(key: string, prefix: string = 'cache'): Promise<boolean> {
    try {
      const refreshMarker = await this.get(`${key}:refresh`, { prefix, serialize: false });
      return refreshMarker === null; // If refresh marker expired, needs refresh
    } catch (error) {
      return true; // Assume needs refresh on error
    }
  }

  /**
   * Get or set pattern (cache-aside)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T | null> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key, options);
      if (cached !== null) {
        return cached;
      }

      // If not in cache, fetch data
      const data = await fetcher();
      if (data !== null && data !== undefined) {
        // Store in cache
        await this.set(key, data, options);
      }

      return data;
    } catch (error) {
      console.error('Redis getOrSet error:', error);
      // Fallback to direct fetcher call
      return await fetcher();
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string, prefix: string = 'cache'): Promise<number> {
    try {
      if (!this.isHealthy()) {
        return 0;
      }

      const fullPattern = `${prefix}:${pattern}`;
      const keys = await this.redis.keys(fullPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.redis.del(...keys);
      console.log(`Invalidated ${result} cache entries matching pattern: ${fullPattern}`);
      return result;
    } catch (error) {
      console.error('Redis invalidatePattern error:', error);
      return 0;
    }
  }

  // ============================================================================
  // Session Management Methods
  // ============================================================================

  /**
   * Store session data
   */
  async setSession(sessionId: string, sessionData: SessionData): Promise<boolean> {
    try {
      const success = await this.set(sessionId, sessionData, {
        ttl: this.sessionTTL,
        prefix: 'session',
      });

      if (success) {
        // Also store user session mapping for quick lookup
        await this.set(
          `user:${sessionData.userId}`,
          sessionId,
          { ttl: this.sessionTTL, prefix: 'session' }
        );
      }

      return success;
    } catch (error) {
      console.error('Redis setSession error:', error);
      return false;
    }
  }

  /**
   * Get session data
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const session = await this.get<SessionData>(sessionId, { prefix: 'session' });
      
      if (session) {
        // Update last accessed time
        session.lastAccessed = Date.now();
        await this.setSession(sessionId, session);
      }

      return session;
    } catch (error) {
      console.error('Redis getSession error:', error);
      return null;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      // Get session to find user ID
      const session = await this.get<SessionData>(sessionId, { prefix: 'session' });
      
      // Delete session
      const deleted = await this.del(sessionId, 'session');
      
      // Delete user session mapping
      if (session) {
        await this.del(`user:${session.userId}`, 'session');
      }

      return deleted;
    } catch (error) {
      console.error('Redis deleteSession error:', error);
      return false;
    }
  }

  /**
   * Get user's active session
   */
  async getUserSession(userId: string): Promise<SessionData | null> {
    try {
      const sessionId = await this.get(`user:${userId}`, { 
        prefix: 'session',
        serialize: false 
      });
      
      if (!sessionId || typeof sessionId !== 'string') {
        return null;
      }

      return await this.getSession(sessionId);
    } catch (error) {
      console.error('Redis getUserSession error:', error);
      return null;
    }
  }

  /**
   * Refresh session TTL
   */
  async refreshSession(sessionId: string): Promise<boolean> {
    try {
      if (!this.isHealthy()) {
        return false;
      }

      const fullKey = `session:${sessionId}`;
      const result = await this.redis.expire(fullKey, this.sessionTTL);
      return result === 1;
    } catch (error) {
      console.error('Redis refreshSession error:', error);
      return false;
    }
  }

  // ============================================================================
  // Rate Limiting Methods
  // ============================================================================

  /**
   * Check and increment rate limit
   */
  async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
    prefix: string = 'ratelimit'
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    try {
      if (!this.isHealthy()) {
        // If Redis is down, allow the request but log warning
        console.warn('Redis unavailable for rate limiting, allowing request');
        return { allowed: true, remaining: limit - 1, resetTime: Date.now() + windowSeconds * 1000 };
      }

      const fullKey = `${prefix}:${key}`;
      const now = Date.now();
      const windowStart = now - (windowSeconds * 1000);

      // Use Redis sorted set for sliding window rate limiting
      const pipeline = this.redis.pipeline();
      
      // Remove expired entries
      pipeline.zremrangebyscore(fullKey, 0, windowStart);
      
      // Count current requests in window
      pipeline.zcard(fullKey);
      
      // Add current request
      pipeline.zadd(fullKey, now, `${now}-${Math.random()}`);
      
      // Set expiration
      pipeline.expire(fullKey, windowSeconds);
      
      const results = await pipeline.exec();
      
      if (!results) {
        throw new Error('Pipeline execution failed');
      }

      const currentCount = (results[1][1] as number) || 0;
      const allowed = currentCount < limit;
      const remaining = Math.max(0, limit - currentCount - 1);
      const resetTime = now + (windowSeconds * 1000);

      return { allowed, remaining, resetTime };
    } catch (error) {
      console.error('Redis rate limit error:', error);
      // On error, allow request but with minimal remaining
      return { allowed: true, remaining: 0, resetTime: Date.now() + windowSeconds * 1000 };
    }
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(
    key: string,
    limit: number,
    windowSeconds: number,
    prefix: string = 'ratelimit'
  ): Promise<{ count: number; remaining: number; resetTime: number }> {
    try {
      if (!this.isHealthy()) {
        return { count: 0, remaining: limit, resetTime: Date.now() + windowSeconds * 1000 };
      }

      const fullKey = `${prefix}:${key}`;
      const now = Date.now();
      const windowStart = now - (windowSeconds * 1000);

      // Clean up expired entries and count
      await this.redis.zremrangebyscore(fullKey, 0, windowStart);
      const count = await this.redis.zcard(fullKey);

      const remaining = Math.max(0, limit - count);
      const resetTime = now + (windowSeconds * 1000);

      return { count, remaining, resetTime };
    } catch (error) {
      console.error('Redis rate limit status error:', error);
      return { count: 0, remaining: limit, resetTime: Date.now() + windowSeconds * 1000 };
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Get Redis client for advanced operations
   */
  getClient(): Redis {
    return this.redis;
  }

  /**
   * Flush all cache data (use with caution)
   */
  async flushCache(prefix?: string): Promise<boolean> {
    try {
      if (!this.isHealthy()) {
        return false;
      }

      if (prefix) {
        return (await this.invalidatePattern('*', prefix)) > 0;
      } else {
        await this.redis.flushdb();
        return true;
      }
    } catch (error) {
      console.error('Redis flush error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate?: number;
  }> {
    try {
      if (!this.isHealthy()) {
        return { totalKeys: 0, memoryUsage: '0B' };
      }

      const info = await this.redis.info('memory');
      const dbSize = await this.redis.dbsize();
      
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : '0B';

      return {
        totalKeys: dbSize,
        memoryUsage,
      };
    } catch (error) {
      console.error('Redis stats error:', error);
      return { totalKeys: 0, memoryUsage: '0B' };
    }
  }
}

// Export singleton instance
export const redisManager = RedisManager.getInstance(); 