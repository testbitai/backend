import Joi from "joi";

export const createContact = Joi.object({
  body: Joi.object({
    name: Joi.string().required().messages({
      "string.empty": "Name is required",
    }),
    email: Joi.string().email().required().messages({
      "string.email": "Invalid email address",
      "string.empty": "Email is required",
    }),
    subject: Joi.string().required().messages({
      "string.empty": "Subject is required",
    }),
    message: Joi.string().required().messages({
      "string.empty": "Message is required",
    }),
  }),
});
