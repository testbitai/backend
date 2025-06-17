import Joi from "joi";

const register = Joi.object({
  body: Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    role: Joi.string().valid("student", "tutor").default("student"),
    examGoals: Joi.array().items(Joi.string().valid("JEE", "BITSAT")),
  }),
});

const login = Joi.object({
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
});

const refreshTokens = Joi.object({
  body: Joi.object({
    refreshToken: Joi.string().required(),
  }),
});

const forgotPassword = Joi.object({
  body: Joi.object({
    email: Joi.string().email().required(),
  }),
});

const resetPassword = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
});

const verifyEmail = Joi.object({
  body: Joi.object({
    token: Joi.string().required(),
  }),
});

export default {
  register,
  login,
  refreshTokens,
  forgotPassword,
  resetPassword,
  verifyEmail,
};
