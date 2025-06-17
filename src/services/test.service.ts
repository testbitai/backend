import { RequestUser, RequestWithUser } from "../interfaces/request.interface";
import TestModel from "../models/test.model";
import TestAttemptModel from "../models/testAttempt.model";
import User, { UserDocument } from "../models/user.model";
import { ApiError } from "../utils/apiError";
import httpStatus from "http-status";
import mongoose from "mongoose";

class TestService {
  public createTest = async (user: RequestUser, data: any) => {
    const {
      title,
      description,
      examType,
      subject,
      type,
      difficulty,
      questions,
      duration,
    } = data;

    let allowedStudents: mongoose.Types.ObjectId[] = [];

    if (user?.role === "tutor") {
      const tutor = await User.findById(user?._id).select(
        "tutorDetails.students"
      );
      if (!tutor || !tutor.tutorDetails?.students) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Tutor has no students");
      }
      allowedStudents = tutor.tutorDetails.students;
    }

    const test = await TestModel.create({
      title,
      description,
      examType,
      subject,
      type,
      difficulty,
      questions,
      duration,
      createdBy: user._id,
      createdByRole: user.role,
      allowedStudents: user.role === "tutor" ? allowedStudents : [],
      isPublished: true,
      isPurchased: false,
    });

    return test;
  };

  public editTest = async (user: RequestUser, testId: string, data: any) => {
    const test = await TestModel.findById(testId);

    if (!test) {
      throw new ApiError(httpStatus.NOT_FOUND, "Test not found");
    }

    if (
      user.role === "tutor" &&
      (!test.createdBy.equals(user?._id) || test.createdByRole !== "tutor")
    ) {
      throw new ApiError(httpStatus.FORBIDDEN, "You cannot edit this test");
    }

    Object.assign(test, data);

    await test.save();

    return test;
  };

  public deleteTest = async (user: RequestUser, testId: string) => {
    const test = await TestModel.findById(testId);

    if (!test) {
      throw new ApiError(httpStatus.NOT_FOUND, "Test not found");
    }

    if (
      user.role === "tutor" &&
      (!test.createdBy.equals(user._id) || test.createdByRole !== "tutor")
    ) {
      throw new ApiError(httpStatus.FORBIDDEN, "You cannot delete this test");
    }

    await test.deleteOne();
  };

  public getTests = async (user: RequestUser, query: any) => {
    const filter: any = { isPublished: true };

    if (user.role === "student") {
      filter.$or = [
        { createdByRole: "admin" },
        { createdByRole: "tutor", allowedStudents: user._id },
      ];
    }

    if (query.subject) {
      filter.subject = query.subject;
    }

    if (query.type) {
      filter.type = query.type;
    }

    if (query.difficulty) {
      filter.difficulty = query.difficulty;
    }

    // Only select the length of questions array, not the questions themselves
    const tests = await TestModel.find(filter).select(
      "title subject type examType difficulty createdByRole questions"
    );

    // Add numberOfQuestions field and remove questions field
    const testsWithCount = tests.map((test) => {
      const testObj = test.toObject();
      const numberOfQuestions = testObj.questions
        ? testObj.questions.length
        : 0;
      // Remove questions field
      delete (testObj as { questions?: any }).questions;
      return {
        ...testObj,
        numberOfQuestions,
      };
    });

    return testsWithCount;
  };

  public getTestById = async (user: RequestUser, testId: string) => {
    const test = await TestModel.findById(testId);

    if (!test) {
      throw new ApiError(httpStatus.NOT_FOUND, "Test not found");
    }

    if (test.createdByRole === "tutor") {
      if (
        user.role !== "student" ||
        !test.allowedStudents?.includes(new mongoose.Types.ObjectId(user?._id))
      ) {
        throw new ApiError(
          httpStatus.FORBIDDEN,
          "You do not have access to this test"
        );
      }
    }

    // Convert to object and remove correctAnswer and explanation from each question
    // const testObj = test.toObject();
    // if (Array.isArray(testObj.questions)) {
    //   testObj.questions = testObj.questions.map((q: any) => {
    //     const { correctAnswer, explanation, ...rest } = q;
    //     return rest;
    //   });
    // }

    return test;
  };

  public submitTest = async (user: RequestUser, testId: string, data: any) => {
    const test = await TestModel.findById(testId);

    if (!test) {
      throw new ApiError(httpStatus.NOT_FOUND, "Test not found");
    }

    if (test.createdByRole === "tutor") {
      if (
        user.role !== "student" ||
        !test.allowedStudents?.includes(new mongoose.Types.ObjectId(user._id))
      ) {
        throw new ApiError(
          httpStatus.FORBIDDEN,
          "You do not have access to this test"
        );
      }
    }

    const { attemptedQuestions } = data;

    let correctCount = 0;
    let totalQuestions = test.questions.length;

    const detailedAttempt = attemptedQuestions.map((attempt: any) => {
      const q = test.questions[attempt.questionId];
      const isCorrect = q.correctAnswer === attempt.selectedAnswer;
      if (isCorrect) correctCount++;
      return {
        questionId: attempt.questionId,
        selectedAnswer: attempt.selectedAnswer,
        isCorrect,
        timeTaken: attempt.timeTaken,
      };
    });

    const incorrectCount = totalQuestions - correctCount;
    const scorePercent = (correctCount / totalQuestions) * 100;

    const testAttempt = await TestAttemptModel.create({
      user: user._id,
      test: test._id,
      scorePercent,
      totalQuestions,
      correctCount,
      incorrectCount,
      attemptedQuestions: detailedAttempt,
    });

    return testAttempt;
  };

  public getTestHistory = async (userId: string) => {
    const history = await TestAttemptModel.find({ user: userId })
      .populate("test", "title subject type examType")
      .sort({ attemptedAt: -1 });

    return history;
  };

  public async getTestResultForTest(userId: string, testId: string) {
    const testResult = await TestAttemptModel.findOne({
      user: userId,
      test: testId,
    }).populate("test");

    if (!testResult) {
      throw new ApiError(httpStatus.NOT_FOUND, "Test result not found");
    }

    return testResult;
  }
}

export default new TestService();
