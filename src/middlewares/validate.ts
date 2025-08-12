import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { pick } from 'lodash';
import httpStatus from 'http-status';
import { ApiError } from '../utils/apiError';

/**
 * Custom validation options for Joi
 */
const validationOptions: Joi.ValidationOptions = {
  abortEarly: false,
  allowUnknown: true,
  stripUnknown: true,
};

/**
 * Generic request validator middleware
 * @param {Joi.Schema} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
export const validate = (schema: Joi.Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Extract the parts of the request we want to validate
    const validParts = pick(req, ['params', 'query', 'body', 'files']);

    // Validate the request using the schema
    const { value, error } = schema.validate(validParts, validationOptions);

    // If validation fails, throw an error
    if (error) {
      const errorMessage = error.details
        .map((details) => details.message.replace(/"/g, ''))
        .join(', ');
      return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    }

    // Replace the request with validated values, but handle read-only properties carefully
    try {
      if (value.params) {
        req.params = { ...req.params, ...value.params };
      }
      if (value.body) {
        req.body = value.body;
      }
      if (value.query) {
        // Create a new query object to avoid modifying read-only properties
        const newQuery: any = {};
        Object.keys(value.query).forEach(key => {
          newQuery[key] = value.query[key];
        });
        // Merge with existing query parameters
        Object.keys(req.query).forEach(key => {
          if (!(key in newQuery)) {
            newQuery[key] = req.query[key];
          }
        });
        // Replace the query object
        (req as any).query = newQuery;
      }
      if (value.files) {
        (req as any).files = value.files;
      }
    } catch (assignError) {
      console.warn('Warning: Could not assign validated values to request:', assignError);
      // Continue anyway - validation passed, assignment failed but that's not critical
    }
    
    return next();
  };
};

/**
 * Async version of the validator (for use with async/await)
 */
export const asyncValidate = (schema: Joi.Schema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validParts = pick(req, ['params', 'query', 'body', 'files']);
      const { value, error } = schema.validate(validParts, validationOptions);

      if (error) {
        const errorMessage = error.details
          .map((details) => details.message.replace(/"/g, ''))
          .join(', ');
        throw new ApiError(httpStatus.BAD_REQUEST, errorMessage);
      }

      // Handle validated values carefully
      try {
        if (value.params) {
          req.params = { ...req.params, ...value.params };
        }
        if (value.body) {
          req.body = value.body;
        }
        if (value.query) {
          const newQuery: any = {};
          Object.keys(value.query).forEach(key => {
            newQuery[key] = value.query[key];
          });
          Object.keys(req.query).forEach(key => {
            if (!(key in newQuery)) {
              newQuery[key] = req.query[key];
            }
          });
          (req as any).query = newQuery;
        }
        if (value.files) {
          (req as any).files = value.files;
        }
      } catch (assignError) {
        console.warn('Warning: Could not assign validated values to request:', assignError);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Custom validation rules
 */
export const customValidations = {
  password: Joi.string()
    .min(8)
    .max(30)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])'))
    .message(
      'Password must contain at least 1 lowercase, 1 uppercase, 1 number, and 1 special character'
    ),
  objectId: Joi.string().regex(/^[0-9a-fA-F]{24}$/, 'valid ObjectId'),
  email: Joi.string().email().lowercase().trim(),
  phone: Joi.string().pattern(/^[0-9]{10,15}$/),
};

/**
 * Helper to validate specific request parts
 */
export const validateRequestPart = (part: 'body' | 'params' | 'query', schema: Joi.Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[part], validationOptions);
    
    if (error) {
      const errorMessage = error.details
        .map((details) => details.message.replace(/"/g, ''))
        .join(', ');
      return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    }

    try {
      req[part] = value;
    } catch (assignError) {
      console.warn(`Warning: Could not assign validated ${part}:`, assignError);
    }
    next();
  };
};

export default {
  validate,
  asyncValidate,
  customValidations,
  validateRequestPart,
};
