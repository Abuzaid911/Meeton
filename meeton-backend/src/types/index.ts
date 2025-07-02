// User types for API responses
export interface UserProfile {
  id: string;
  email: string | null;
  username: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  location: string | null;
  onboardingCompleted: boolean;
  emailVerified: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicUserProfile {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  location: string | null;
  createdAt: Date;
}

// JWT Token payload interface
export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  name?: string;
  iat: number;
  exp: number;
} 