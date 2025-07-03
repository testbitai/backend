import Joi from "joi";
import { TestType, ExamType, Subject } from "../models/test.model";

const createTest = Joi.object({
  body: Joi.object({
    title: Joi.string().required(),
    description: Joi.string().optional(),
    duration: Joi.number().required(),
    examType: Joi.string()
      .valid(...Object.values(ExamType))
      .required(),
    type: Joi.string()
      .valid(...Object.values(TestType))
      .required(),
    sections: Joi.array()
      .items(
        Joi.object({
          subject: Joi.string()
            .valid(...Object.values(Subject))
            .required(),
          questions: Joi.array()
            .items(
              Joi.object({
                questionText: Joi.string().required(),
                options: Joi.array().items(Joi.string()).length(4).required(),
                correctAnswer: Joi.string().required(),
                explanation: Joi.string().allow("").optional(),
                difficulty: Joi.string()
                  .valid("Easy", "Medium", "Hard")
                  .required(),
              })
            )
            .min(1)
            .required(),
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

export const submitTest = Joi.object({
  body: Joi.object({
    attemptedQuestions: Joi.array()
      .items(
        Joi.object({
          sectionIndex: Joi.number().integer().min(0).required(),
          questionIndex: Joi.number().integer().min(0).required(),
          selectedAnswer: Joi.string()
            .valid("A", "B", "C", "D")
            .required(),
          timeTaken: Joi.number().min(0).required(),
           answerHistory: Joi.array()
            .items(Joi.string().valid("A", "B", "C", "D"))
            .min(1)
            .optional(),
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
