// Extend Express Request interface with user type
import { User as PrismaUser } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string | null;
        username: string;
        name?: string | null;
        image?: string | null;
        onboardingCompleted?: boolean;
        iat?: number;
        exp?: number;
      };
      file?: {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        destination: string;
        filename: string;
        path: string;
        size: number;
      };
    }
    
    // Override the default User interface
    interface User {
      id: string;
      email: string | null;
      username: string;
      name?: string | null;
      image?: string | null;
      onboardingCompleted?: boolean;
      iat?: number;
      exp?: number;
    }
  }
}

export {}; 