import { Request, Response, NextFunction } from "express";
import { RequestWithUser } from "../interfaces/request.interface";
import httpStatus from "http-status";
import { ApiResponse } from "../utils/apiResponse";
import supportService from "../services/support.service";

class SupportController {
  public createSupportTicket = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await supportService.createSupportTicket(
        req.user!,
        req.body
      );
      new ApiResponse(
        res,
        httpStatus.CREATED,
        "Support ticket created successfully",
        result
      );
    } catch (error) {
      next(error);
    }
  };

  public getMySupportTickets = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await supportService.getSupportTicketsByUser(
        new (require("mongoose").Types.ObjectId)(req.user!._id),
        req.query
      );
      new ApiResponse(
        res,
        httpStatus.OK,
        "Support tickets fetched successfully",
        result
      );
    } catch (error) {
      next(error);
    }
  };

  public getAllSupportTickets = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await supportService.getAllSupportTickets(req.query);
      new ApiResponse(
        res,
        httpStatus.OK,
        "Support tickets fetched successfully",
        result
      );
    } catch (error) {
      next(error);
    }
  };

  public getSupportTicketById = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await supportService.getSupportTicketById(req.params.id);
      new ApiResponse(
        res,
        httpStatus.OK,
        "Support ticket fetched successfully",
        result
      );
    } catch (error) {
      next(error);
    }
  };

  public updateSupportTicket = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const mongoose = require("mongoose");
      const result = await supportService.updateSupportTicket(
        req.params.id,
        req.body,
        new mongoose.Types.ObjectId(req.user!._id)
      );
      new ApiResponse(
        res,
        httpStatus.OK,
        "Support ticket updated successfully",
        result
      );
    } catch (error) {
      next(error);
    }
  };

  public getAnalytics = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await supportService.getSupportAnalytics();

      new ApiResponse(
        res,
        httpStatus.OK,
        "Support analytics fetched successfully",
        result
      );
    } catch (error) {
      next(error);
    }
  };
}

export default new SupportController();
