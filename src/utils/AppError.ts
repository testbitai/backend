import logger from "../config/logger";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    logger.error(`[ERROR] ${message}`);

    Error.captureStackTrace(this, this.constructor);
  }
}
