import express from "express";
import authController from "../controllers/auth.controller";
import authValidation from "../validations/auth.validation";
import authMiddleware from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate";

const router = express.Router();

// Public routes
router.post(
  "/register",
  validate(authValidation.register),
  authController.register
);

router.post("/login", validate(authValidation.login), authController.login);
router.post(
  "/refresh-tokens",
  validate(authValidation.refreshTokens),
  authController.refreshTokens
);
router.post(
  "/forgot-password",
  validate(authValidation.forgotPassword),
  authController.forgotPassword
);
router.post(
  "/reset-password",
  validate(authValidation.resetPassword),
  authController.resetPassword
);

router.post(
  '/resend-verification-email',
  authMiddleware.authenticate,
  authController.resendVerificationEmail
);


router.post(
  "/verify-email",
  validate(authValidation.verifyEmail),
  authController.verifyEmail
);

// Protected routes (require auth)
router.post("/logout", authMiddleware.authenticate, authController.logout);

export default router;
