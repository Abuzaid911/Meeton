import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

/**
 * Validation middleware factory
 * Creates middleware to validate request data using Zod schemas
 */
export const validateRequest = (schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }

      // Validate query parameters
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }

      // Validate route parameters
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        next(new ValidationError('Validation failed', details));
      } else {
        next(error);
      }
    }
  };
};

/**
 * Validate request body only
 */
export const validateBody = (schema: ZodSchema) => {
  return validateRequest({ body: schema });
};

/**
 * Validate query parameters only
 */
export const validateQuery = (schema: ZodSchema) => {
  return validateRequest({ query: schema });
};

/**
 * Validate route parameters only
 */
export const validateParams = (schema: ZodSchema) => {
  return validateRequest({ params: schema });
};

/**
 * ID parameter validation schema
 */
import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

export const eventIdParamSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
});

export const userIdParamSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export const commentIdParamSchema = z.object({
  commentId: z.string().min(1, 'Comment ID is required'),
});

/**
 * Common validation middlewares
 */
export const validateId = validateParams(idParamSchema);
export const validateEventId = validateParams(eventIdParamSchema);
export const validateUserId = validateParams(userIdParamSchema);
export const validateCommentId = validateParams(commentIdParamSchema); 