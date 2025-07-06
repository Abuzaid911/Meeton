// Environment configuration
// Note: In a production app, you would store this securely and never commit the actual API key to version control

export const ENV = {
  // Google Places API Configuration
  GOOGLE_PLACES_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || 'YOUR_GOOGLE_PLACES_API_KEY',
  
  // Other API endpoints and configurations can go here
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000',
  
  // Development flags
  IS_DEV: __DEV__,
  
  // Feature flags
  ENABLE_REAL_LOCATION_SEARCH: process.env.EXPO_PUBLIC_ENABLE_REAL_LOCATION_SEARCH === 'true' || false,
};

// Helper function to check if required environment variables are set
export const validateEnvironment = () => {
  const missing = [];
  
  if (ENV.GOOGLE_PLACES_API_KEY === 'YOUR_GOOGLE_PLACES_API_KEY') {
    missing.push('EXPO_PUBLIC_GOOGLE_PLACES_API_KEY');
  }
  
  if (missing.length > 0) {
    console.warn(
      `⚠️  Missing environment variables: ${missing.join(', ')}\n` +
      'Please create a .env file in your project root and add these variables.\n' +
      'Example:\n' +
      'EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_actual_api_key_here'
    );
  }
  
  return missing.length === 0;
};

export default ENV; 