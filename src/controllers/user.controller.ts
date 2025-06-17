import { Request, Response, NextFunction } from "express";
import httpStatus from "http-status";
import userService from "../services/user.service";
import { ApiResponse } from "../utils/apiResponse";
import { RequestWithUser } from "../interfaces/request.interface";

class UserController {
  /**
   * Create a user (sign up)
   */
  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.createUser(req.body);
      new ApiResponse(
        res,
        httpStatus.CREATED,
        "User created successfully",
        user
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) {
    try {
      const user = await userService.getUserById(req.user?._id as string);
      new ApiResponse(res, httpStatus.OK, "User retrieved successfully", user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update current user profile
   */
  async updateCurrentUser(
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) {
    try {
      const user = await userService.updateUserById(
        req.user?._id as string,
        req.body
      );
      new ApiResponse(res, httpStatus.OK, "User updated successfully", user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete current user account
   */
  async deleteCurrentUser(
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) {
    try {
      await userService.deleteUserById(req.user?._id as string);
      new ApiResponse(res, httpStatus.OK, "User deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(req: RequestWithUser, res: Response, next: NextFunction) {
    try {
      // if (!req.file) {
      //   throw new ApiError(httpStatus.BAD_REQUEST, 'No file uploaded');
      // }
      // const user = await userService.updateUserAvatar(req.user?._id as string, req.file.path);
      // new ApiResponse(res, httpStatus.OK, 'Avatar uploaded successfully', { avatarUrl: user.avatar });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user's badges
   */
  async getMyBadges(req: RequestWithUser, res: Response, next: NextFunction) {
    try {
      const badges = await userService.getUserBadges(req.user?._id as string);
      new ApiResponse(res, httpStatus.OK, "Badges retrieved successfully", {
        badges,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update study buddy preferences
   */
  async updateStudyBuddy(
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) {
    try {
      const user = await userService.updateStudyBuddy(
        req.user?._id as string,
        req.body
      );
      new ApiResponse(res, httpStatus.OK, "Study buddy updated successfully", {
        studyBuddy: user.studyBuddy,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all users (admin only)
   */
  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { results, totalResults, totalPages, page, limit } =
        await userService.queryUsers(req.query);
      new ApiResponse(res, httpStatus.OK, "Users retrieved successfully", {
        results,
        page,
        limit,
        totalPages,
        totalResults,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user by ID (admin only)
   */
  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.getUserById(req.params.userId);
      new ApiResponse(res, httpStatus.OK, "User retrieved successfully", user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user by ID (admin only)
   */
  async updateUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.updateUserById(
        req.params.userId,
        req.body
      );
      new ApiResponse(res, httpStatus.OK, "User updated successfully", user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user by ID (admin only)
   */
  async deleteUserById(req: Request, res: Response, next: NextFunction) {
    try {
      await userService.deleteUserById(req.params.userId);
      new ApiResponse(res, httpStatus.OK, "User deleted successfully");
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController();
