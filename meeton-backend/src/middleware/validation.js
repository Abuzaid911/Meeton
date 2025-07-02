"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCommentId = exports.validateUserId = exports.validateEventId = exports.validateId = exports.commentIdParamSchema = exports.userIdParamSchema = exports.eventIdParamSchema = exports.idParamSchema = exports.validateParams = exports.validateQuery = exports.validateBody = exports.validateRequest = void 0;
const zod_1 = require("zod");
const errors_1 = require("../utils/errors");
/**
 * Validation middleware factory
 * Creates middleware to validate request data using Zod schemas
 */
const validateRequest = (schema) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
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
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const details = error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                    code: err.code,
                }));
                next(new errors_1.ValidationError('Validation failed', details));
            }
            else {
                next(error);
            }
        }
    });
};
exports.validateRequest = validateRequest;
/**
 * Validate request body only
 */
const validateBody = (schema) => {
    return (0, exports.validateRequest)({ body: schema });
};
exports.validateBody = validateBody;
/**
 * Validate query parameters only
 */
const validateQuery = (schema) => {
    return (0, exports.validateRequest)({ query: schema });
};
exports.validateQuery = validateQuery;
/**
 * Validate route parameters only
 */
const validateParams = (schema) => {
    return (0, exports.validateRequest)({ params: schema });
};
exports.validateParams = validateParams;
/**
 * ID parameter validation schema
 */
const zod_2 = require("zod");
exports.idParamSchema = zod_2.z.object({
    id: zod_2.z.string().min(1, 'ID is required'),
});
exports.eventIdParamSchema = zod_2.z.object({
    eventId: zod_2.z.string().min(1, 'Event ID is required'),
});
exports.userIdParamSchema = zod_2.z.object({
    userId: zod_2.z.string().min(1, 'User ID is required'),
});
exports.commentIdParamSchema = zod_2.z.object({
    commentId: zod_2.z.string().min(1, 'Comment ID is required'),
});
/**
 * Common validation middlewares
 */
exports.validateId = (0, exports.validateParams)(exports.idParamSchema);
exports.validateEventId = (0, exports.validateParams)(exports.eventIdParamSchema);
exports.validateUserId = (0, exports.validateParams)(exports.userIdParamSchema);
exports.validateCommentId = (0, exports.validateParams)(exports.commentIdParamSchema);
