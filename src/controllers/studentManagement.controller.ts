import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import studentManagementService from '../services/studentManagement.service';
import { ApiResponse } from '../utils/apiResponse';
import { RequestWithUser } from '../interfaces/request.interface';

class StudentManagementController {
  /**
   * Generate invite code for students
   */
  public generateInviteCode = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const invitation = await studentManagementService.generateInviteCode(
        req.user!._id,
        req.body
      );

      new ApiResponse(
        res,
        httpStatus.CREATED,
        'Invite code generated successfully',
        invitation
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all invitations for tutor
   */
  public getTutorInvitations = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await studentManagementService.getTutorInvitations(
        req.user!._id,
        req.query
      );

      new ApiResponse(
        res,
        httpStatus.OK,
        'Invitations retrieved successfully',
        result
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Join tutor using invite code (for students)
   */
  public joinTutorByCode = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { inviteCode } = req.params;
      const invitation = await studentManagementService.joinTutorByCode(
        req.user!._id,
        inviteCode
      );

      new ApiResponse(
        res,
        httpStatus.OK,
        'Successfully joined tutor',
        invitation
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get invitation details by code (public endpoint for join page)
   */
  public getInvitationByCode = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { inviteCode } = req.params;
      const invitation = await studentManagementService.getInvitationByCode(inviteCode);

      if (!invitation) {
        new ApiResponse(
          res,
          httpStatus.NOT_FOUND,
          'Invalid or expired invite code',
          null
        );
        return;
      }

      new ApiResponse(
        res,
        httpStatus.OK,
        'Invitation details retrieved successfully',
        invitation
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Approve or reject student invitation
   */
  public updateInvitationStatus = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { invitationId } = req.params;
      const { status, reason } = req.body;

      const invitation = await studentManagementService.updateInvitationStatus(
        req.user!._id,
        invitationId,
        status,
        reason
      );

      new ApiResponse(
        res,
        httpStatus.OK,
        `Invitation ${status} successfully`,
        invitation
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get tutor's students
   */
  public getTutorStudents = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await studentManagementService.getTutorStudents(
        req.user!._id,
        req.query
      );

      new ApiResponse(
        res,
        httpStatus.OK,
        'Students retrieved successfully',
        result
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get student management statistics
   */
  public getStudentStats = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const stats = await studentManagementService.getStudentStats(req.user!._id);

      new ApiResponse(
        res,
        httpStatus.OK,
        'Student statistics retrieved successfully',
        stats
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Remove student from tutor
   */
  public removeStudent = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { studentId } = req.params;
      await studentManagementService.removeStudent(req.user!._id, studentId);

      new ApiResponse(
        res,
        httpStatus.OK,
        'Student removed successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Resend invitation
   */
  public resendInvitation = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { invitationId } = req.params;
      const invitation = await studentManagementService.resendInvitation(
        req.user!._id,
        invitationId
      );

      new ApiResponse(
        res,
        httpStatus.OK,
        'Invitation resent successfully',
        invitation
      );
    } catch (error) {
      next(error);
    }
  };
}

export default new StudentManagementController();
