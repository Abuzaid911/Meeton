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

export interface RSVPButtonProps {
  currentRSVP: RSVP;
  onRSVPChange: (rsvp: RSVP) => void;
  eventId: string;
} 