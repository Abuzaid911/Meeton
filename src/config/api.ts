/**
 * API Configuration
 * Handles environment-specific API URLs
 */

// Determine if we're in development or production
const isDev = __DEV__ || process.env.NODE_ENV === 'development';

// API Base URLs for different environments
const API_URLS = {
  development: 'http://localhost:3000/api',
  production: 'https://meeton-backend-abuzaid911.onrender.com/api', // Your actual Render URL
};

// Export the appropriate API URL based on environment
export const API_BASE_URL = isDev ? API_URLS.development : API_URLS.production;

// For debugging
console.log(`🌐 API Environment: ${isDev ? 'Development' : 'Production'}`);
console.log(`🔗 API Base URL: ${API_BASE_URL}`);

export default {
  API_BASE_URL,
  isDev,
}; 