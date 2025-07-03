import express from "express";
import contactController from "../controllers/contact.controller";
import { createContact } from "../validations/contact.validation";
import authMiddleware from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate";

const router = express.Router();

// Public - anyone can submit contact message
router.post("/", validate(createContact), contactController.createContact);

// Admin - get all contact messages
router.get(
  "/",
  authMiddleware.authenticate,
  authMiddleware.authorizeRoles("admin"),
  contactController.getContacts
);

export default router;
