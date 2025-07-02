// Extend Express Request interface with user type
import { User as PrismaUser } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
        name?: string;
        image?: string;
        onboardingCompleted?: boolean;
        iat?: number;
        exp?: number;
      };
    }
  }
}

export {}; 