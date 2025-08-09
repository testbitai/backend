import { Request, Response, NextFunction } from "express";
import httpStatus from "http-status";
import authService from "../services/auth.service";
import { ApiResponse } from "../utils/apiResponse";
import { RequestWithUser } from "../interfaces/request.interface";

class AuthController {
  public register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.registerUser(req.body);
      new ApiResponse(
        res,
        httpStatus.CREATED,
        "Registration successful",
        result
      );
    } catch (error) {
      next(error);
    }
  };

  public login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      console.log(req.body)
      const result = await authService.loginUser(email, password);
      new ApiResponse(res, httpStatus.OK, "Login successful", result);
    } catch (error) {
      next(error);
    }
  };

  public logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.logoutUser(req.body.refreshToken);
      new ApiResponse(res, httpStatus.OK, "Logged out successfully");
    } catch (error) {
      next(error);
    }
  };

  public refreshTokens = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const tokens = await authService.refreshAuthTokens(req.body.refreshToken);
      new ApiResponse(res, httpStatus.OK, "Tokens refreshed", { tokens });
    } catch (error) {
      next(error);
    }
  };

  public forgotPassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      await authService.sendForgotPasswordEmail(req.body.email);
      new ApiResponse(res, httpStatus.OK, "Password reset email sent");
    } catch (error) {
      next(error);
    }
  };

  public resetPassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { token, newPassword } = req.body;
      await authService.resetUserPassword(token, newPassword);
      new ApiResponse(res, httpStatus.OK, "Password reset successful");
    } catch (error) {
      next(error);
    }
  };

  public verifyEmail = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      await authService.verifyUserEmail(req.body.token);
      new ApiResponse(res, httpStatus.OK, "Email verified successfully");
    } catch (error) {
      next(error);
    }
  };

  public resendVerificationEmail = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user || !req.user.email) {
        return next(new Error("User email not found in request"));
      }
      const { email } = req.user;

      await authService.resendVerificationEmail(email);

      new ApiResponse(
        res,
        httpStatus.OK,
        "Verification email resent successfully"
      );
    } catch (error) {
      next(error);
    }
  };
}

export default new AuthController();
