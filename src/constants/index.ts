// App Constants
export const Colors = {
  // Primary colors inspired by Apple design
  primary: '#007AFF',
  secondary: '#5856D6',
  accent: '#FF9500',
  
  // System colors
  systemBlue: '#007AFF',
  systemGreen: '#34C759',
  systemIndigo: '#5856D6',
  systemOrange: '#FF9500',
  systemPink: '#FF2D92',
  systemPurple: '#AF52DE',
  systemRed: '#FF3B30',
  systemTeal: '#5AC8FA',
  systemYellow: '#FFCC00',
  
  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',
  gray: '#8E8E93',
  gray2: '#AEAEB2',
  gray3: '#C7C7CC',
  gray4: '#D1D1D6',
  gray5: '#E5E5EA',
  gray6: '#F2F2F7',
  
  // Background colors
  background: '#F2F2F7',
  backgroundSecondary: '#FFFFFF',
  backgroundTertiary: '#F2F2F7',
  
  // Text colors
  text: '#000000',
  textSecondary: '#3C3C43',
  textTertiary: '#3C3C4399',
  textQuaternary: '#3C3C4366',
  
  // Interactive colors
  link: '#007AFF',
  destructive: '#FF3B30',
  
  // Event card gradient colors
  gradients: {
    sunset: ['#FF6B6B', '#4ECDC4'],
    ocean: ['#667eea', '#764ba2'],
    forest: ['#134e5e', '#71b280'],
    fire: ['#f093fb', '#f5576c'],
    sky: ['#4facfe', '#00f2fe'],
    lavender: ['#a8edea', '#fed6e3'],
    peach: ['#ffecd2', '#fcb69f'],
    mint: ['#a8e6cf', '#88d8c0'],
  }
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 999,
};

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  headline: 28,
  largeTitle: 34,
};

export const FontWeight = {
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
};

export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
};

export const Layout = {
  window: {
    width: 375, // iPhone default width
    height: 812, // iPhone default height
  },
  tabBarHeight: 83,
  headerHeight: 44,
  statusBarHeight: 44,
};

export const EventCategories = [
  'Party',
  'Meeting',
  'Birthday',
  'Wedding',
  'Conference',
  'Workshop',
  'Dinner',
  'Sports',
  'Music',
  'Art',
  'Travel',
  'Business',
  'Social',
  'Family',
  'Other',
];

export const EventTags = [
  'Fun',
  'Casual',
  'Formal',
  'Outdoor',
  'Indoor',
  'Food',
  'Drinks',
  'Music',
  'Dancing',
  'Networking',
  'Learning',
  'Creative',
  'Sports',
  'Family-friendly',
  'Adults-only',
];

export const DefaultEventColors = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9',
];

export const AppConfig = {
  // API endpoints (for future use)
  apiBaseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
  
  // Feature flags
  enablePushNotifications: true,
  enableLocationServices: true,
  enablePhotoSharing: true,
  enableSocialFeatures: true,
  
  // App metadata
  appName: 'MeetOn',
  appVersion: '1.0.0',
  
  // Limits
  maxEventPhotos: 50,
  maxEventCapacity: 1000,
  maxEventDurationHours: 24,
  maxEventDescription: 500,
  maxCommentLength: 280,
};

export const AnimationConfig = {
  spring: {
    damping: 20,
    stiffness: 300,
  },
  timing: {
    duration: 300,
  },
};

export const HapticFeedback = {
  light: 'light' as const,
  medium: 'medium' as const,
  heavy: 'heavy' as const,
  success: 'success' as const,
  warning: 'warning' as const,
  error: 'error' as const,
}; 