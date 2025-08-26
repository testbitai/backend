import { Request, Response, NextFunction } from "express";
import httpStatus from "http-status";
import testService from "../services/test.service";
// import aiAnalysisService from "../services/aiAnalysis.service"; // Real OpenAI service
// import aiAnalysisService from "../services/aiAnalysis.service.mock"; // Original mock service
import aiAnalysisService from "../services/aiAnalysis.service.mock.improved"; // Improved mock service with better topic categorization
import { ApiResponse } from "../utils/apiResponse";
import { RequestWithUser } from "../interfaces/request.interface";
import TestAttemptModel from "../models/testAttempt.model";
import TestModel from "../models/test.model";

class TestController {
  public createTest = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await testService.createTest(req.user as any, req.body);
      new ApiResponse(
        res,
        httpStatus.CREATED,
        "Test created successfully",
        result
      );
    } catch (error) {
      next(error);
    }
  };

  public editTest = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await testService.editTest(
        req.user!,
        req.params.id,
        req.body
      );
      new ApiResponse(res, httpStatus.OK, "Test updated successfully", result);
    } catch (error) {
      next(error);
    }
  };

  public deleteTest = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      await testService.deleteTest(req.user!, req.params.id);
      new ApiResponse(res, httpStatus.OK, "Test deleted successfully");
    } catch (error) {
      next(error);
    }
  };

  public getTests = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await testService.getTests(req.user!, req.query);
      new ApiResponse(res, httpStatus.OK, "Tests fetched successfully", result);
    } catch (error) {
      next(error);
    }
  };

  public getTestById = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await testService.getTestById(req.user!, req.params.id);
      new ApiResponse(res, httpStatus.OK, "Test fetched successfully", result);
    } catch (error) {
      next(error);
    }
  };

  public submitTest = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await testService.submitTest(
        req.user!,
        req.params.id,
        req.body
      );
      new ApiResponse(
        res,
        httpStatus.CREATED,
        "Test submitted successfully",
        result
      );
    } catch (error) {
      next(error);
    }
  };

  public toggleTestPublication = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await testService.toggleTestPublication(
        req.user!,
        req.params.id,
        req.body.isPublished
      );
      new ApiResponse(
        res,
        httpStatus.OK,
        "Test publication status updated successfully",
        result
      );
    } catch (error) {
      next(error);
    }
  };

  public getTestHistory = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await testService.getTestHistory(req.params.userId);
      new ApiResponse(
        res,
        httpStatus.OK,
        "Test history fetched successfully",
        result
      );
    } catch (error) {
      next(error);
    }
  };

  public getTestResultForTest = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { testId } = req.params;
      if (!req.user || !req.user._id) {
        return next(new Error("User not authenticated"));
      }
      const userId = req.user._id;

      const result = await testService.getTestResultForTest(userId, testId);

      new ApiResponse(
        res,
        httpStatus.OK,
        "Test result fetched successfully",
        result
      );
    } catch (error) {
      next(error);
    }
  };

  public getAIAnalysis = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { testAttemptId } = req.params;
      if (!req.user || !req.user._id) {
        return next(new Error("User not authenticated"));
      }

      // Fetch test attempt with populated test data
      const testAttempt = await TestAttemptModel.findById(testAttemptId)
        .populate('test')
        .populate('user');

      if (!testAttempt) {
        new ApiResponse(
          res,
          httpStatus.NOT_FOUND,
          "Test attempt not found"
        );
        return;
      }


      // Verify the test attempt belongs to the authenticated user
      if (testAttempt.user._id.toString() !== req.user._id.toString()) {
        new ApiResponse(
          res,
          httpStatus.FORBIDDEN,
          "Access denied to this test attempt"
        );
        return;
      }

      // Get the full test document
      const test = await TestModel.findById(testAttempt.test);
      if (!test) {
        new ApiResponse(
          res,
          httpStatus.NOT_FOUND,
          "Test not found"
        );
        return;
      }

      // Generate AI analysis
      const aiAnalysis = await aiAnalysisService.generateDetailedAnalysis(
        testAttempt,
        test
      );

      new ApiResponse(
        res,
        httpStatus.OK,
        "AI analysis generated successfully",
        aiAnalysis
      );
    } catch (error) {
      console.error('AI Analysis Error:', error);
      next(error);
    }
  };
}

export default new TestController();
