// Core Types for MeetOn App
// Based on Prisma schema

export interface User {
  id: string;
  name?: string;
  email?: string;
  emailVerified?: Date;
  image?: string;
  username: string;
  bio?: string;
  dateOfBirth?: Date;
  gender?: string;
  location?: string;
  interests: string[];
  language?: string;
  timezone?: string;
  lastActive?: Date;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Event {
  id: string;
  name: string;
  date: Date;
  time: string;
  location: string;
  lat?: number;
  lng?: number;
  image?: string;
  description?: string;
  duration: number;
  capacity?: number;
  rsvpDeadline?: Date;
  headerType?: string;
  headerColor?: string;
  headerImageUrl?: string;
  isArchived: boolean;
  archivedAt?: Date;
  category?: string;
  tags: string[];
  privacyLevel: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE';
  viewCount: number;
  shareCount: number;
  cancelledAt?: Date;
  ticketPrice?: number;
  externalUrl?: string;
  weather?: any;
  parentEventId?: string;
  locationDetails?: any;
  createdAt: Date;
  updatedAt: Date;
  hostId: string;
  host: User;
  attendees?: Attendee[];
  photos?: EventPhoto[];
  comments?: Comment[];
}

export enum RSVP {
  YES = 'YES',
  MAYBE = 'MAYBE',
  NO = 'NO',
  PENDING = 'PENDING'
}

export interface Attendee {
  id: string;
  rsvp: RSVP;
  responseTime?: Date;
  inviteMethod?: string;
  checkedIn: boolean;
  checkinTime?: Date;
  inviteOpenedAt?: Date;
  inviteOpenCount: number;
  lastNotifiedAt?: Date;
  userId: string;
  eventId: string;
  user: User;
  event: Event;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  text: string;
  sentiment?: number;
  attachments: string[];
  editHistory?: any;
  mentions: string[];
  reactionCounts?: any;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  eventId: string;
  user: User;
  event: Event;
  reactions?: CommentReaction[];
}

export interface CommentReaction {
  id: string;
  commentId: string;
  userId: string;
  reactionType: string;
  createdAt: Date;
}

export interface EventPhoto {
  id: string;
  imageUrl: string;
  caption?: string;
  uploadedAt: Date;
  storageKey?: string;
  eventId: string;
  userId: string;
  user: User;
  event: Event;
  likeCount: number;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'declined';
  responseTime?: Date;
  seenAt?: Date;
  declineReason?: string;
  createdAt: Date;
  updatedAt: Date;
  sender: User;
  receiver: User;
}

export enum NotificationSourceType {
  ATTENDEE = 'ATTENDEE',
  FRIEND_REQUEST = 'FRIEND_REQUEST',
  EVENT_UPDATE = 'EVENT_UPDATE',
  EVENT_CANCELLED = 'EVENT_CANCELLED',
  EVENT_REMINDER = 'EVENT_REMINDER',
  COMMENT = 'COMMENT',
  MENTION = 'MENTION',
  SYSTEM = 'SYSTEM',
  PRIVATE_INVITATION = 'PRIVATE_INVITATION'
}

export interface Notification {
  id: string;
  message: string;
  link?: string;
  sourceType: NotificationSourceType;
  isRead: boolean;
  readAt?: Date;
  deliveryStatus?: string;
  clickedAt?: Date;
  dismissedAt?: Date;
  priority: number;
  attendeeId?: string;
  friendRequestId?: string;
  targetUserId: string;
  targetUser: User;
  createdAt: Date;
}

// App-specific types
export interface CreateEventData {
  name: string;
  date: Date;
  time: string;
  location: string;
  description?: string;
  duration: number;
  capacity?: number;
  headerType?: 'color' | 'image';
  headerColor?: string;
  headerImageUrl?: string;
  category?: string;
  tags: string[];
  privacyLevel: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE';
}

export interface RSVPButtonProps {
  currentRSVP: RSVP;
  onRSVPChange: (rsvp: RSVP) => void;
  eventId: string;
}

// ============================================================================
// Live Location Types
// ============================================================================

export enum LocationSharingLevel {
  PRIVATE = 'PRIVATE',
  FRIENDS_ONLY = 'FRIENDS_ONLY',
  EVENT_ONLY = 'EVENT_ONLY',
  PUBLIC = 'PUBLIC'
}

export enum GeofenceAlertType {
  APPROACHING = 'APPROACHING',
  ARRIVED = 'ARRIVED',
  LEFT = 'LEFT'
}

export interface LiveLocation {
  id: string;
  userId: string;
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  altitude?: number;
  batteryLevel?: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  sharingLevel: LocationSharingLevel;
  sharingExpiresAt?: Date;
  eventId?: string;
  isAtEvent: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: User;
  event?: Event;
}

export interface LocationHistory {
  id: string;
  userId: string;
  lat: number;
  lng: number;
  accuracy?: number;
  address?: string;
  eventId?: string;
  createdAt: Date;
  user: User;
  event?: Event;
}

export interface GeofenceAlert {
  id: string;
  userId: string;
  eventId: string;
  alertType: GeofenceAlertType;
  radius: number;
  distance: number;
  triggered: boolean;
  triggeredAt?: Date;
  isActive: boolean;
  createdAt: Date;
  user: User;
  event: Event;
}

export interface NearbyUser {
  userId: string;
  name: string;
  image?: string;
  distance: number; // in meters
  lastSeen: Date;
  isAtEvent?: boolean;
  eventId?: string;
}

export interface LocationAnalytics {
  totalUsers: number;
  activeUsers: number;
  usersAtEvents: number;
  averageAccuracy: number;
  locationUpdatesPerMinute: number;
}

export interface LocationUpdateData {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  altitude?: number;
  batteryLevel?: number;
  eventId?: string;
}

export interface LocationShareSettings {
  sharingLevel: LocationSharingLevel;
  sharingExpiresAt?: Date;
  eventId?: string;
}

export interface GeofenceSettings {
  eventId: string;
  radius: number; // in meters
  alertTypes: GeofenceAlertType[];
}

export interface LocationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'undetermined';
}

export interface DeviceLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

// WebSocket event types
export interface WebSocketEvents {
  location_update: LocationUpdateData;
  location_updated: LiveLocation;
  nearby_users: NearbyUser[];
  event_locations: { eventId: string; users: NearbyUser[] };
  geofence_alert: GeofenceAlert;
  location_sharing_started: LocationShareSettings;
  location_sharing_stopped: { userId: string };
  user_status_changed: { userId: string; status: 'online' | 'offline'; timestamp: Date };
}

// Component Props
export interface LocationSharingProps {
  currentUser: User;
  onSharingChange?: (settings: LocationShareSettings) => void;
}

export interface NearbyUsersProps {
  currentUser: User;
  onUserSelect?: (user: NearbyUser) => void;
  radius?: number;
}

export interface EventLocationProps {
  event: Event;
  currentUser: User;
  onLocationUpdate?: (users: NearbyUser[]) => void;
}

export interface LocationMapProps {
  locations: Array<{
    userId: string;
    name: string;
    image?: string;
    lat: number;
    lng: number;
    isCurrentUser?: boolean;
  }>;
  currentLocation?: DeviceLocation;
  onLocationPress?: (userId: string) => void;
  showCurrentLocation?: boolean;
  followUser?: boolean;
}

export interface LocationSettingsProps {
  currentSettings: LocationShareSettings;
  onSettingsChange: (settings: LocationShareSettings) => void;
}

// ============================================================================
// Voice Event Types
// ============================================================================

export interface VoiceEventData {
  name?: string;
  description?: string;
  date?: string;
  time?: string;
  location?: string;
  type?: string;
  duration?: number;
}

export interface VoiceTranscriptionResult {
  text: string;
  confidence?: number;
  language?: string;
}

export interface VoiceRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  uri?: string;
}

export interface VoiceEventCreatorProps {
  onEventDataParsed: (eventData: VoiceEventData) => void;
  onError?: (error: string) => void;
  onTranscriptionReceived?: (transcription: VoiceTranscriptionResult) => void;
}

// Navigation types update
export interface NavigationParamList {
  Home: undefined;
  CreateEvent: undefined;
  EventDetails: { eventId: string };
  EditEvent: { eventId: string };
  Profile: { userId?: string };
  EditProfile: undefined;
  Search: undefined;
  Notifications: undefined;
  GuestList: { eventId: string };
  EventPhotos: { eventId: string };
  Settings: undefined;
  LocationSettings: undefined;
  LocationMap: { eventId?: string };
  NearbyUsers: undefined;
}

export interface EventCardProps {
  event: Event;
  onPress: () => void;
  currentUserId: string;
}

export interface UserAvatarProps {
  user: User;
  size?: 'small' | 'medium' | 'large';
  showOnlineStatus?: boolean;
} 