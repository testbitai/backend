import Joi from "joi";
import {
  SupportCategory,
  SupportPriority,
  SupportStatus,
} from "../models/supportTicket.model";

export const createSupportTicket = Joi.object({
  body: Joi.object({
    subject: Joi.string().required(),
    category: Joi.string()
      .valid(...SupportCategory)
      .required(),
    priority: Joi.string()
      .valid(...SupportPriority)
      .default("Low"),
    description: Joi.string().required(),
  }),
});

export const updateSupportTicket = Joi.object({
  body: Joi.object({
    status: Joi.string().valid(...SupportStatus).optional(),
    resolutionNotes: Joi.string().optional().allow(""),
  }),
});
