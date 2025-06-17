import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import jwt from 'jsonwebtoken';
import User from '../models/user.model';
import config from '../config/config';
import { RequestWithUser } from '../interfaces/request.interface';
import { ApiError } from '../utils/apiError';

const authenticate = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');

    const payload = jwt.verify(token, config.jwt.secret) as { userId: string };
    const user = await User.findById(payload.userId);
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');

    req.user = {
      _id: (user._id as string).toString(),
      role: user.role,
      email: user.email,
    };
    next();
  } catch (error) {
    console.log(error)
    next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token'));
  }
};

const authorizeRoles = (...roles: string[]) => {
  return (req: RequestWithUser, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Unauthorized access');
    }
    next();
  };
};

export default {
  authenticate,
  authorizeRoles,
};