import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import tutorService from '../services/tutor.service';
import { ApiResponse } from '../utils/apiResponse';
import { RequestWithUser } from '../interfaces/request.interface';

class TutorController {
  /**
   * Send OTP for tutor email verification
   */
  public sendOTP = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      await tutorService.sendTutorOTP(email);
      
      new ApiResponse(
        res,
        httpStatus.OK,
        'OTP sent successfully to your email',
        { email }
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Verify tutor email with OTP
   */
  public verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, otp } = req.body;
      const result = await tutorService.verifyTutorEmail(email, otp);
      
      new ApiResponse(
        res,
        httpStatus.OK,
        'Email verified successfully',
        result
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Register a new tutor
   */
  public register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await tutorService.registerTutor(req.body);
      
      new ApiResponse(
        res,
        httpStatus.CREATED,
        'Tutor registration successful',
        result
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update tutor profile
   */
  public updateProfile = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(httpStatus.UNAUTHORIZED).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const result = await tutorService.updateTutorProfile(req.user._id, req.body);
      
      new ApiResponse(
        res,
        httpStatus.OK,
        'Profile updated successfully',
        result
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Generate invite code for students
   */
  public generateInviteCode = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(httpStatus.UNAUTHORIZED).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { expiresInDays, maxUses } = req.body;
      const result = await tutorService.generateInviteCode(
        req.user._id,
        expiresInDays,
        maxUses
      );
      
      new ApiResponse(
        res,
        httpStatus.CREATED,
        'Invite code generated successfully',
        result
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get tutor dashboard data
   */
  public getDashboard = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(httpStatus.UNAUTHORIZED).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const result = await tutorService.getTutorDashboard(req.user._id);
      
      new ApiResponse(
        res,
        httpStatus.OK,
        'Dashboard data retrieved successfully',
        result
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get tutor statistics (admin only)
   */
  public getTutorStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await tutorService.getTutorStats();
      
      new ApiResponse(
        res,
        httpStatus.OK,
        'Tutor statistics retrieved successfully',
        stats
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all tutors (admin only)
   */
  public getAllTutors = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page = 1, limit = 10, search, status } = req.query;
      
      const result = await tutorService.getAllTutors(
        Number(page),
        Number(limit),
        search as string,
        status as string
      );
      
      new ApiResponse(
        res,
        httpStatus.OK,
        'Tutors retrieved successfully',
        result
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Verify tutor (admin only)
   */
  public verifyTutor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tutorId } = req.params;
      const { isVerified } = req.body;
      
      const result = await tutorService.verifyTutor(tutorId, isVerified);
      
      new ApiResponse(
        res,
        httpStatus.OK,
        `Tutor ${isVerified ? 'verified' : 'unverified'} successfully`,
        result
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update subscription status
   */
  public updateSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tutorId } = req.params;
      const { status, paymentId } = req.body;
      
      const result = await tutorService.updateSubscriptionStatus(tutorId, status, paymentId);
      
      new ApiResponse(
        res,
        httpStatus.OK,
        'Subscription status updated successfully',
        result
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get tutor profile
   */
  public getProfile = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(httpStatus.UNAUTHORIZED).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      new ApiResponse(
        res,
        httpStatus.OK,
        'Profile retrieved successfully',
        { user: req.user }
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get tutor by ID (admin only)
   */
  public getTutorById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tutorId } = req.params;
      const result = await tutorService.getTutorDashboard(tutorId);
      
      new ApiResponse(
        res,
        httpStatus.OK,
        'Tutor details retrieved successfully',
        result
      );
    } catch (error) {
      next(error);
    }
  };
}

export default new TutorController();
