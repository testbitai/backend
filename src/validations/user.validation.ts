import Joi from "joi";
import { objectId, password } from "./custom.validation";

const createUser = Joi.object({
  body: Joi.object().keys({
    name: Joi.string().required(),
    email: Joi.string().required().email(),
    password: Joi.string().required().custom(password),
    role: Joi.string().valid("student", "tutor", "admin").default("student"),
    examGoals: Joi.array().items(Joi.string().valid("JEE", "BITSAT")),
    avatar: Joi.string(),
  }),
});

const updateMe = Joi.object({
  body: Joi.object().keys({
    name: Joi.string(),
    email: Joi.string().email(),
    avatar: Joi.string(),
    examGoals: Joi.array().items(Joi.string().valid("JEE", "BITSAT")),
  }),
});

const updateStudyBuddy = Joi.object({
  body: Joi.object().keys({
    name: Joi.string(),
    style: Joi.string(),
    level: Joi.string().valid("Trainee", "Apprentice", "Master", "Guru"),
  }),
});

const getUsers = Joi.object({
  query: Joi.object().keys({
    name: Joi.string(),
    role: Joi.string(),
    examGoals: Joi.array().items(Joi.string().valid("JEE", "BITSAT")),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
});

const getUser = Joi.object({
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
});

const updateUser = Joi.object({
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
  body: Joi.object().keys({
    name: Joi.string(),
    email: Joi.string().email(),
    role: Joi.string().valid("student", "tutor", "admin"),
    coins: Joi.number(),
    examGoals: Joi.array().items(Joi.string().valid("JEE", "BITSAT")),
  }),
});

const deleteUser = Joi.object({
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
});

export default {
  createUser,
  updateMe,
  updateStudyBuddy,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
};
