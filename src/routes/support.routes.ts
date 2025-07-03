import express from "express";
import authMiddleware from "../middlewares/auth.middleware";
import {
  createSupportTicket,
  updateSupportTicket,
} from "../validations/support.validation";
import supportController from "../controllers/support.controller";
import { validate } from "../middlewares/validate";

const router = express.Router();

// USER: create support ticket
router.post(
  "/",
  authMiddleware.authenticate,
  authMiddleware.authorizeRoles("student", "tutor"),
  validate(createSupportTicket),
  supportController.createSupportTicket
);

// USER: get my tickets
router.get(
  "/my",
  authMiddleware.authenticate,
  authMiddleware.authorizeRoles("student", "tutor"),
  supportController.getMySupportTickets
);

// ADMIN: list all tickets
router.get(
  "/",
  authMiddleware.authenticate,
  authMiddleware.authorizeRoles("admin"),
  supportController.getAllSupportTickets
);

// ADMIN: update ticket status
router.patch(
  "/:id",
  authMiddleware.authenticate,
  authMiddleware.authorizeRoles("admin"),
  validate(updateSupportTicket),
  supportController.updateSupportTicket
);

router.get(
  "/analytics",
  authMiddleware.authenticate,
  authMiddleware.authorizeRoles("admin"),
  supportController.getAnalytics
);


// USER: get a single ticket
router.get(
  "/:id",
  authMiddleware.authenticate,
  supportController.getSupportTicketById
);

export default router;
