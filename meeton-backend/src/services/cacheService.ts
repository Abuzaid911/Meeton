import { redisManager } from '../config/redis';
import { User, Event } from '@prisma/client';

/**
 * Cache Service for MeetOn Application
 * Provides caching for frequently accessed data
 */

export interface CachedEvent extends Event {
  host: any;
  attendees: any[];
  _count?: {
    attendees: number;
    analytics?: number;
  };
}

export interface CachedUser extends User {
  _count?: {
    hostedEvents: number;
    attendedEvents: number;
    friends: number;
  };
}

export interface CachedFriend {
  id: string;
  userId: string;
  friendId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  user: User;
  friend: User;
}

export class CacheService {
  private static instance: CacheService;
  
  // Cache TTL configurations (in seconds)
  private readonly TTL = {
    EVENT: 1800,      // 30 minutes
    USER: 3600,       // 1 hour
    FRIEND_LIST: 1800, // 30 minutes
    EVENT_LIST: 900,   // 15 minutes
    USER_PROFILE: 3600, // 1 hour
    SEARCH_RESULTS: 600, // 10 minutes
    ANALYTICS: 300,    // 5 minutes
  };

  private constructor() {}

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // ============================================================================
  // Event Caching
  // ============================================================================

  /**
   * Cache a single event
   */
  async cacheEvent(event: CachedEvent): Promise<boolean> {
    const key = `event:${event.id}`;
    return await redisManager.set(key, event, { ttl: this.TTL.EVENT });
  }

  /**
   * Get cached event
   */
  async getCachedEvent(eventId: string): Promise<CachedEvent | null> {
    const key = `event:${eventId}`;
    return await redisManager.get<CachedEvent>(key);
  }

  /**
   * Cache event list for a user
   */
  async cacheUserEvents(userId: string, events: CachedEvent[], type: 'hosted' | 'attending' | 'all'): Promise<boolean> {
    const key = `user:${userId}:events:${type}`;
    return await redisManager.set(key, events, { ttl: this.TTL.EVENT_LIST });
  }

  /**
   * Get cached user events
   */
  async getCachedUserEvents(userId: string, type: 'hosted' | 'attending' | 'all'): Promise<CachedEvent[] | null> {
    const key = `user:${userId}:events:${type}`;
    return await redisManager.get<CachedEvent[]>(key);
  }

  /**
   * Cache nearby events
   */
  async cacheNearbyEvents(latitude: number, longitude: number, radius: number, events: CachedEvent[]): Promise<boolean> {
    const key = `events:nearby:${latitude.toFixed(3)}:${longitude.toFixed(3)}:${radius}`;
    return await redisManager.set(key, events, { ttl: this.TTL.EVENT_LIST });
  }

  /**
   * Get cached nearby events
   */
  async getCachedNearbyEvents(latitude: number, longitude: number, radius: number): Promise<CachedEvent[] | null> {
    const key = `events:nearby:${latitude.toFixed(3)}:${longitude.toFixed(3)}:${radius}`;
    return await redisManager.get<CachedEvent[]>(key);
  }

  /**
   * Cache trending events
   */
  async cacheTrendingEvents(events: CachedEvent[]): Promise<boolean> {
    const key = 'events:trending';
    return await redisManager.set(key, events, { ttl: this.TTL.EVENT_LIST });
  }

  /**
   * Get cached trending events
   */
  async getCachedTrendingEvents(): Promise<CachedEvent[] | null> {
    const key = 'events:trending';
    return await redisManager.get<CachedEvent[]>(key);
  }

  /**
   * Cache event search results
   */
  async cacheEventSearch(query: string, filters: any, results: CachedEvent[]): Promise<boolean> {
    const filterHash = this.hashObject(filters);
    const key = `search:events:${query}:${filterHash}`;
    return await redisManager.set(key, results, { ttl: this.TTL.SEARCH_RESULTS });
  }

  /**
   * Get cached event search results
   */
  async getCachedEventSearch(query: string, filters: any): Promise<CachedEvent[] | null> {
    const filterHash = this.hashObject(filters);
    const key = `search:events:${query}:${filterHash}`;
    return await redisManager.get<CachedEvent[]>(key);
  }

  /**
   * Invalidate event cache
   */
  async invalidateEventCache(eventId: string): Promise<void> {
    await Promise.all([
      redisManager.del(`event:${eventId}`),
      redisManager.invalidatePattern(`user:*:events:*`),
      redisManager.invalidatePattern(`events:nearby:*`),
      redisManager.del('events:trending'),
      redisManager.invalidatePattern(`search:events:*`),
    ]);
  }

  // ============================================================================
  // User Caching
  // ============================================================================

  /**
   * Cache a user profile
   */
  async cacheUser(user: CachedUser): Promise<boolean> {
    const key = `user:${user.id}`;
    return await redisManager.set(key, user, { ttl: this.TTL.USER });
  }

  /**
   * Get cached user profile
   */
  async getCachedUser(userId: string): Promise<CachedUser | null> {
    const key = `user:${userId}`;
    return await redisManager.get<CachedUser>(key);
  }

  /**
   * Cache user profile with extended data
   */
  async cacheUserProfile(userId: string, profile: any): Promise<boolean> {
    const key = `user:${userId}:profile`;
    return await redisManager.set(key, profile, { ttl: this.TTL.USER_PROFILE });
  }

  /**
   * Get cached user profile with extended data
   */
  async getCachedUserProfile(userId: string): Promise<any | null> {
    const key = `user:${userId}:profile`;
    return await redisManager.get(key);
  }

  /**
   * Cache user search results
   */
  async cacheUserSearch(query: string, results: CachedUser[]): Promise<boolean> {
    const key = `search:users:${query}`;
    return await redisManager.set(key, results, { ttl: this.TTL.SEARCH_RESULTS });
  }

  /**
   * Get cached user search results
   */
  async getCachedUserSearch(query: string): Promise<CachedUser[] | null> {
    const key = `search:users:${query}`;
    return await redisManager.get<CachedUser[]>(key);
  }

  /**
   * Invalidate user cache
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await Promise.all([
      redisManager.del(`user:${userId}`),
      redisManager.del(`user:${userId}:profile`),
      redisManager.invalidatePattern(`user:${userId}:events:*`),
      redisManager.invalidatePattern(`user:${userId}:friends:*`),
      redisManager.invalidatePattern(`search:users:*`),
    ]);
  }

  // ============================================================================
  // Friend List Caching
  // ============================================================================

  /**
   * Cache user's friend list
   */
  async cacheFriendList(userId: string, friends: CachedFriend[]): Promise<boolean> {
    const key = `user:${userId}:friends`;
    return await redisManager.set(key, friends, { ttl: this.TTL.FRIEND_LIST });
  }

  /**
   * Get cached friend list
   */
  async getCachedFriendList(userId: string): Promise<CachedFriend[] | null> {
    const key = `user:${userId}:friends`;
    return await redisManager.get<CachedFriend[]>(key);
  }

  /**
   * Cache friend requests (sent)
   */
  async cacheSentFriendRequests(userId: string, requests: CachedFriend[]): Promise<boolean> {
    const key = `user:${userId}:friends:sent`;
    return await redisManager.set(key, requests, { ttl: this.TTL.FRIEND_LIST });
  }

  /**
   * Get cached sent friend requests
   */
  async getCachedSentFriendRequests(userId: string): Promise<CachedFriend[] | null> {
    const key = `user:${userId}:friends:sent`;
    return await redisManager.get<CachedFriend[]>(key);
  }

  /**
   * Cache friend requests (received)
   */
  async cacheReceivedFriendRequests(userId: string, requests: CachedFriend[]): Promise<boolean> {
    const key = `user:${userId}:friends:received`;
    return await redisManager.set(key, requests, { ttl: this.TTL.FRIEND_LIST });
  }

  /**
   * Get cached received friend requests
   */
  async getCachedReceivedFriendRequests(userId: string): Promise<CachedFriend[] | null> {
    const key = `user:${userId}:friends:received`;
    return await redisManager.get<CachedFriend[]>(key);
  }

  /**
   * Cache mutual friends
   */
  async cacheMutualFriends(userId1: string, userId2: string, mutualFriends: CachedUser[]): Promise<boolean> {
    const key = `mutual:${userId1}:${userId2}`;
    return await redisManager.set(key, mutualFriends, { ttl: this.TTL.FRIEND_LIST });
  }

  /**
   * Get cached mutual friends
   */
  async getCachedMutualFriends(userId1: string, userId2: string): Promise<CachedUser[] | null> {
    const key = `mutual:${userId1}:${userId2}`;
    return await redisManager.get<CachedUser[]>(key);
  }

  /**
   * Invalidate friend cache for a user
   */
  async invalidateFriendCache(userId: string): Promise<void> {
    await Promise.all([
      redisManager.invalidatePattern(`user:${userId}:friends*`),
      redisManager.invalidatePattern(`mutual:${userId}:*`),
      redisManager.invalidatePattern(`mutual:*:${userId}`),
    ]);
  }

  /**
   * Invalidate friend cache for multiple users (when friendship changes)
   */
  async invalidateFriendCacheForUsers(userIds: string[]): Promise<void> {
    const promises = userIds.map(userId => this.invalidateFriendCache(userId));
    await Promise.all(promises);
  }

  // ============================================================================
  // Analytics Caching
  // ============================================================================

  /**
   * Cache event analytics
   */
  async cacheEventAnalytics(eventId: string, analytics: any): Promise<boolean> {
    const key = `analytics:event:${eventId}`;
    return await redisManager.set(key, analytics, { ttl: this.TTL.ANALYTICS });
  }

  /**
   * Get cached event analytics
   */
  async getCachedEventAnalytics(eventId: string): Promise<any | null> {
    const key = `analytics:event:${eventId}`;
    return await redisManager.get(key);
  }

  /**
   * Cache user analytics
   */
  async cacheUserAnalytics(userId: string, analytics: any): Promise<boolean> {
    const key = `analytics:user:${userId}`;
    return await redisManager.set(key, analytics, { ttl: this.TTL.ANALYTICS });
  }

  /**
   * Get cached user analytics
   */
  async getCachedUserAnalytics(userId: string): Promise<any | null> {
    const key = `analytics:user:${userId}`;
    return await redisManager.get(key);
  }

  /**
   * Invalidate analytics cache
   */
  async invalidateAnalyticsCache(eventId?: string, userId?: string): Promise<void> {
    const promises = [];
    
    if (eventId) {
      promises.push(redisManager.del(`analytics:event:${eventId}`));
    }
    
    if (userId) {
      promises.push(redisManager.del(`analytics:user:${userId}`));
    }
    
    await Promise.all(promises);
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  /**
   * Get or set with cache-aside pattern
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T | null> {
    return await redisManager.getOrSet(key, fetcher, { ttl });
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUpCache(): Promise<void> {
    console.log('🔥 Warming up cache...');
    
    try {
      // This would typically be called during application startup
      // to pre-populate cache with frequently accessed data
      
      // Example: Cache trending events
      // const trendingEvents = await eventService.getTrendingEvents();
      // await this.cacheTrendingEvents(trendingEvents);
      
      console.log('✅ Cache warm-up completed');
    } catch (error) {
      console.error('❌ Cache warm-up failed:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clearAllCache(): Promise<boolean> {
    return await redisManager.flushCache();
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate?: number;
  }> {
    return await redisManager.getCacheStats();
  }

  /**
   * Check cache health
   */
  async isHealthy(): Promise<boolean> {
    return redisManager.isHealthy();
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Hash an object to create a consistent cache key
   */
  private hashObject(obj: any): string {
    return Buffer.from(JSON.stringify(obj)).toString('base64').slice(0, 16);
  }

  /**
   * Generate cache key with namespace
   */
  private generateKey(namespace: string, ...parts: string[]): string {
    return `${namespace}:${parts.join(':')}`;
  }

  /**
   * Batch invalidate cache keys
   */
  async batchInvalidate(patterns: string[]): Promise<void> {
    const promises = patterns.map(pattern => 
      redisManager.invalidatePattern(pattern)
    );
    await Promise.all(promises);
  }

  /**
   * Set cache with tags for easier invalidation
   */
  async setWithTags(key: string, value: any, tags: string[], ttl: number = 3600): Promise<boolean> {
    const success = await redisManager.set(key, value, { ttl });
    
    if (success && tags.length > 0) {
      // Store tag associations
      const promises = tags.map(tag => 
        redisManager.set(`tag:${tag}:${key}`, true, { ttl: ttl + 60 }) // Slightly longer TTL for tags
      );
      await Promise.all(promises);
    }
    
    return success;
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    for (const tag of tags) {
      await redisManager.invalidatePattern(`tag:${tag}:*`);
    }
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance(); 