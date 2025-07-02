# MeetOn - Social Event Planning App

A React Native mobile app built with Expo that allows users to create, manage, and RSVP to social events. Inspired by Apple's Invites app design.

## Features

### ✅ Current Features
- **Event Management**: View upcoming events in a beautiful card-based layout
- **Navigation**: Bottom tab navigation with 5 main sections (Upcoming, Search, Create, Activity, Profile)
- **Event Cards**: Apple Invites-inspired design with gradient/image backgrounds
- **Mock Data**: Complete backend simulation with realistic event and user data
- **TypeScript**: Fully typed with interfaces based on Prisma schema

### 🚧 Planned Features
- **Event Creation**: Full event creation form with date/time pickers, location, and photos
- **RSVP System**: Going/Maybe/Not Going responses with attendee management
- **Event Details**: Comprehensive event view with weather, directions, and guest interactions
- **Photo Sharing**: Shared photo albums for events
- **Search & Discovery**: Find events by location, category, or keywords
- **Notifications**: Real-time activity feed and push notifications
- **User Profiles**: Complete user management and friend system
- **Supabase Integration**: Real backend with authentication and data persistence

## Tech Stack

- **Frontend**: React Native with Expo
- **Navigation**: React Navigation (Stack + Bottom Tabs)
- **Styling**: StyleSheet with design system
- **Icons**: Expo Vector Icons (Ionicons)
- **Gradients**: Expo Linear Gradient
- **Type Safety**: TypeScript
- **Backend (Planned)**: Supabase
- **Database Schema**: Prisma (already defined)

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── common/         # Generic components
│   ├── events/         # Event-specific components
│   └── users/          # User-specific components
├── constants/          # App-wide constants (colors, spacing, etc.)
├── hooks/              # Custom React hooks
├── navigation/         # Navigation configuration
├── screens/            # Screen components
│   ├── auth/          # Authentication screens
│   ├── events/        # Event-related screens
│   └── profile/       # Profile screens
├── services/          # API calls and business logic
├── types/             # TypeScript interfaces
└── utils/             # Utility functions
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (Mac) or Android Emulator

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd MeetOn
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npx expo start
   ```

4. **Run on device/simulator**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go app on your phone

## Design System

The app follows Apple's Human Interface Guidelines with a custom design system:

### Colors
- Primary: `#007AFF` (iOS Blue)
- Background: `#F2F2F7` (iOS System Background)
- Cards: `#FFFFFF` with subtle shadows
- Text: Multiple shades for hierarchy

### Typography
- San Francisco font family (system default)
- Font sizes: 12px - 34px
- Font weights: Light (300) to Heavy (800)

### Layout
- Spacing: 4px base unit (4, 8, 16, 24, 32, 48)
- Border radius: 8, 12, 16, 24px
- Card width: Screen width - 48px

## Mock Data

The app includes comprehensive mock data for development:

- **Users**: 5 sample users with profiles and avatars
- **Events**: 4 sample events including birthday party and housewarming
- **Attendees**: RSVP data with various response types
- **Photos**: Sample event photos with captions
- **Notifications**: Activity feed examples

## Database Schema

The project includes a complete Prisma schema (`schema.prisma`) with models for:

- Users (with authentication and profile data)
- Events (with rich metadata and privacy settings)
- Attendees (with RSVP tracking)
- Comments and Reactions
- Event Photos
- Friend Requests
- Notifications
- User Activity Tracking

## Next Steps

1. **Event Details Screen**: Implement full event view with RSVP buttons
2. **Create Event Flow**: Build multi-step event creation form
3. **Photo Sharing**: Implement camera integration and photo uploads
4. **Backend Integration**: Connect to Supabase for real data
5. **Authentication**: Add user login/signup flow
6. **Push Notifications**: Implement Expo Notifications
7. **Maps Integration**: Add location picker and directions

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Design inspiration from Apple's Invites app
- React Navigation for excellent navigation patterns
- Expo team for the amazing development platform 