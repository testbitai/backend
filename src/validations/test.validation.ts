import Joi from "joi";
import { TestType, ExamType, Subject } from "../models/test.model";

const createTest = Joi.object({
  body: Joi.object({
    title: Joi.string().required(),
    description: Joi.string().optional(),
    duration: Joi.number().optional(),
    examType: Joi.string()
      .valid(...Object.values(ExamType))
      .required(),
    subject: Joi.string()
      .valid(...Object.values(Subject))
      .required(),
    type: Joi.string()
      .valid(...Object.values(TestType))
      .required(),
    difficulty: Joi.string().valid("Easy", "Medium", "Hard").required(),
    questions: Joi.array()
      .items(
        Joi.object({
          questionText: Joi.string().required(),
          options: Joi.array()
            .items(Joi.string().required())
            .length(4)
            .required(),
          correctAnswer: Joi.string().required(),
          explanation: Joi.string().allow("").optional(),
        })
      )
      .min(1)
      .required(),
  }),
});

const editTest = Joi.object({
  body: Joi.object({
    title: Joi.string().optional(),
    description: Joi.string().optional(),
    examType: Joi.string()
      .valid(...Object.values(ExamType))
      .optional(),
    subject: Joi.string()
      .valid(...Object.values(Subject))
      .optional(),
    type: Joi.string()
      .valid(...Object.values(TestType))
      .optional(),
    difficulty: Joi.string().valid("Easy", "Medium", "Hard").optional(),
    questions: Joi.array()
      .items(
        Joi.object({
          questionText: Joi.string().required(),
          options: Joi.array()
            .items(Joi.string().required())
            .length(4)
            .required(),
          correctAnswer: Joi.string().required(),
        explanation: Joi.string().allow("").optional(),
        })
      )
      .optional(),
  }),
});

const submitTest = Joi.object({
  body: Joi.object({
    attemptedQuestions: Joi.array()
      .items(
        Joi.object({
          questionId: Joi.number().required(),
          selectedAnswer: Joi.string().required(),
          timeTaken: Joi.number().min(0).required(),
        })
      )
      .required(),
  }),
});

export default {
  createTest,
  editTest,
  submitTest,
};
