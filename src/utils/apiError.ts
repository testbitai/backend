import httpStatus from 'http-status';
import { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import logger from '../config/logger';
import config from '../config/config';

/**
 * Custom API Error Class (extends native Error)
 * - Standardizes error responses
 * - Captures stack traces
 * - Supports operational vs programming errors
 */
export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errors?: any[]; // For validation errors

  constructor(
    statusCode: number,
    message: string,
    errors?: any[],
    isOperational: boolean = true,
    stack: string = ''
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;

    // Capture stack trace (excluding constructor call)
    if (stack) {
      this.stack = stack;
    } else if (config.env === 'development') {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Converts other error types (e.g., Mongoose, JWT) to ApiError
 */
export const errorConverter: ErrorRequestHandler = (err, req, res, next) => {
  let error = err;

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e: any) => ({
      field: e.path,
      message: e.message,
    }));
    error = new ApiError(httpStatus.BAD_REQUEST, 'Validation failed', errors);
  } 
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    error = new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token');
  } 
  // Handle Mongoose duplicate key errors
  else if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    error = new ApiError(
      httpStatus.CONFLICT,
      `${field} already exists`,
      undefined,
      true
    );
  }
  // Handle other non-ApiError types
  else if (!(error instanceof ApiError)) {
    const statusCode = err.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
    const message = err.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, undefined, false, err.stack);
  }

  next(error);
};

/**
 * Global error handler middleware
 * - Logs errors
 * - Sends formatted error responses
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const { statusCode, message, errors, isOperational } = err;

  // Log detailed error in development
  if (config.env === 'development') {
    logger.error(`[${req.method}] ${req.path}`, {
      statusCode,
      message,
      stack: err.stack,
    });
  }

  // Prevent leaking internal errors in production
  const response = {
    success: false,
    message,
    ...(errors && { errors }), // Include validation errors if present
    ...(config.env === 'development' && { stack: err.stack }), // Include stack trace in dev
  };

  // Log operational errors
  if (isOperational) {
    logger.warn(`[Operational Error] ${message}`, {
      statusCode,
      path: req.path,
    });
  } else {
    // Critical errors (log with urgency)
    logger.error(`[Critical Error] ${message}`, {
      statusCode,
      path: req.path,
      stack: err.stack,
    });
  }

  res.status(statusCode || 500).json(response);
};

/**
 * Catch 404 and forward to error handler
 */
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'API endpoint not found'));
};

export default {
  ApiError,
  errorConverter,
  errorHandler,
  notFound,
};