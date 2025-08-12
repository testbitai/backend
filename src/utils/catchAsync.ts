import { Request, Response, NextFunction } from 'express';

/**
 * Catch async errors and pass them to the error handling middleware
 * @param fn - Async function to wrap
 * @returns Express middleware function
 */
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => next(err));
  };
};
