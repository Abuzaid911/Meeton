#!/usr/bin/env node

/**
 * Helper script to parse Render Redis URL into environment variables
 * Usage: node scripts/parse-redis-url.js "your-redis-url"
 */

function parseRedisUrl(url) {
  if (!url) {
    console.log('❌ Please provide a Redis URL as an argument');
    console.log('Usage: node scripts/parse-redis-url.js "redis://user:pass@host:port"');
    process.exit(1);
  }

  try {
    const urlObj = new URL(url);
    
    const host = urlObj.hostname;
    const port = urlObj.port || (urlObj.protocol === 'rediss:' ? '6380' : '6379');
    const password = urlObj.password || '';
    const username = urlObj.username || 'default';
    const db = urlObj.pathname.replace('/', '') || '0';
    const useSSL = urlObj.protocol === 'rediss:';

    console.log('🔗 Parsed Redis Configuration:');
    console.log('================================');
    console.log(`REDIS_HOST=${host}`);
    console.log(`REDIS_PORT=${port}`);
    console.log(`REDIS_PASSWORD=${password}`);
    console.log(`REDIS_DB=${db}`);
    console.log(`REDIS_USERNAME=${username}`);
    console.log(`REDIS_USE_SSL=${useSSL}`);
    console.log('');
    console.log('📋 Add these to your Render service environment variables:');
    console.log('================================');
    console.log('Or use the full URL:');
    console.log(`REDIS_URL=${url}`);
    console.log('');
    console.log('🚀 For local development (.env file):');
    console.log('================================');
    console.log(`REDIS_HOST=${host}`);
    console.log(`REDIS_PORT=${port}`);
    console.log(`REDIS_PASSWORD=${password}`);
    console.log(`REDIS_DB=${db}`);

  } catch (error) {
    console.error('❌ Error parsing Redis URL:', error.message);
    console.log('Make sure the URL format is correct: redis://user:pass@host:port/db');
    process.exit(1);
  }
}

// Get URL from command line argument
const redisUrl = process.argv[2];
parseRedisUrl(redisUrl); 