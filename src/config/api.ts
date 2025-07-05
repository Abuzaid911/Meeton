/**
 * API Configuration
 * Handles environment-specific API URLs
 */

// Determine if we're in development or production
// Set FORCE_PRODUCTION to true to test production API in development
const FORCE_PRODUCTION = true; // Change to true to test production API
const isDev = FORCE_PRODUCTION ? false : (__DEV__ || process.env.NODE_ENV === 'development');

// API Base URLs for different environments
const API_URLS = {
  development: 'http://localhost:3000/api',
  production: 'https://meeton-backend.onrender.com/api', // Updated production URL
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