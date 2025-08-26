import express from "express";
import testValidation from "../validations/test.validation";
import authMiddleware from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate";
import testController from "../controllers/test.controller";

const router = express.Router();

router.post(
  "/",
  authMiddleware.authenticate,
  authMiddleware.authorizeRoles("admin", "tutor"),
  validate(testValidation.createTest),
  testController.createTest
);

router.put(
  "/:id",
  authMiddleware.authenticate,
  authMiddleware.authorizeRoles("admin", "tutor"),
  validate(testValidation.editTest),
  testController.editTest
);

router.delete(
  "/:id",
  authMiddleware.authenticate,
  authMiddleware.authorizeRoles("admin", "tutor"),
  testController.deleteTest
);

router.patch(
  "/:id/publish",
  authMiddleware.authenticate,
  authMiddleware.authorizeRoles("admin", "tutor"),
  testController.toggleTestPublication
);

router.get("/", authMiddleware.authenticate, testController.getTests);

router.get("/:id", authMiddleware.authenticate, testController.getTestById);

router.post(
  "/:id/submit",
  authMiddleware.authenticate,
  validate(testValidation.submitTest),
  testController.submitTest
);

router.get(
  "/users/:userId/test-history",
  authMiddleware.authenticate,
  testController.getTestHistory
);

router.get(
  "/test-history/:testId",
  authMiddleware.authenticate,
  testController.getTestResultForTest
);

router.get(
  "/ai-analysis/:testAttemptId",
  authMiddleware.authenticate,
  authMiddleware.authorizeRoles("student"),
  testController.getAIAnalysis
);

router.get(
  "/:testId/attempt-count",
  authMiddleware.authenticate,
  authMiddleware.authorizeRoles("student"),
  testController.getTestAttemptCount
);

router.get(
  "/:testId/all-attempts",
  authMiddleware.authenticate,
  authMiddleware.authorizeRoles("student"),
  testController.getAllTestAttempts
);

export default router;
