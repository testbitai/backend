import { RequestUser, RequestWithUser } from "../interfaces/request.interface";
import TestModel from "../models/test.model";
import TestAttemptModel, {
  AttemptedQuestion,
  SectionAnalytics,
  SubjectAnalytics,
} from "../models/testAttempt.model";
import User, { UserDocument } from "../models/user.model";
import { ApiError } from "../utils/apiError";
import httpStatus from "http-status";
import mongoose from "mongoose";

class TestService {
  public createTest = async (user: RequestUser, data: any) => {
    const { title, description, examType, type, sections, duration } = data;

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
      type,
      sections,
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

  public toggleTestPublication = async (user: RequestUser, testId: string, isPublished: boolean) => {
    const test = await TestModel.findById(testId);

    if (!test) {
      throw new ApiError(httpStatus.NOT_FOUND, "Test not found");
    }

    // Check if user has permission to modify this test
    if (
      user.role === "tutor" &&
      (!test.createdBy.equals(user._id) || test.createdByRole !== "tutor")
    ) {
      throw new ApiError(httpStatus.FORBIDDEN, "You cannot modify this test");
    }

    // Update publication status
    test.isPublished = isPublished;
    await test.save();

    return test;
  };

  public getTests = async (user: RequestUser, query: any) => {
    const {
      page = 1,
      limit = 10,
      search = '',
      type,
      examType,
      subject,
      difficulty,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      createdByRole
    } = query;

    // Base filter
    const filter: any = {};

    // Role-based filtering
    if (user.role === "student") {
      filter.isPublished = true;
      filter.$or = [
        { createdByRole: "admin" },
        { createdByRole: "tutor", allowedStudents: user._id },
      ];
    } else if (user.role === "admin") {
      // Admin can see all tests, optionally filter by creator role
      if (createdByRole && createdByRole !== 'all') {
        filter.createdByRole = createdByRole;
      }
    } else if (user.role === "tutor") {
      // For tutor, fetch only tests created by them (both published and unpublished)
      filter.createdBy = user._id;
      filter.createdByRole = user.role;
    }

    // Search functionality
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { examType: { $regex: search, $options: 'i' } }
      ];
    }

    // Type filter
    if (type && type !== 'all') {
      filter.type = type;
    }

    // Exam type filter
    if (examType && examType !== 'all') {
      filter.examType = examType;
    }

    // Calculate pagination
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Sort configuration
    const sortConfig: any = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const [tests, totalCount] = await Promise.all([
      TestModel.find(filter)
        .select("title description type examType createdByRole sections duration createdAt createdBy")
        .populate('createdBy', 'name email')
        .sort(sortConfig)
        .skip(skip)
        .limit(limitNumber),
      TestModel.countDocuments(filter)
    ]);

    // Filter by subject and difficulty (post-query filtering for complex nested queries)
    let filteredTests = tests;

    if (subject && subject !== 'all') {
      filteredTests = filteredTests.filter((test) =>
        test.sections?.some((section) => section.subject === subject)
      );
    }

    if (difficulty && difficulty !== 'all') {
      filteredTests = filteredTests.filter((test) =>
        test.sections?.some((section) =>
          section.questions?.some((q) => q.difficulty === difficulty)
        )
      );
    }

    // Calculate test statistics
    const testsWithCount = filteredTests.map((test) => {
      const testObj = test.toObject();

      let numberOfQuestions = 0;
      const difficultyCount: Record<string, number> = {
        Easy: 0,
        Medium: 0,
        Hard: 0,
      };

      const subjectCount: Record<string, number> = {};

      if (testObj.sections) {
        for (const section of testObj.sections) {
          if (section.questions) {
            numberOfQuestions += section.questions.length;

            // Count by subject
            if (section.subject) {
              subjectCount[section.subject] = (subjectCount[section.subject] || 0) + section.questions.length;
            }

            // Count by difficulty
            for (const question of section.questions) {
              if (question.difficulty) {
                difficultyCount[question.difficulty] =
                  (difficultyCount[question.difficulty] || 0) + 1;
              }
            }
          }
        }
      }

      let overallDifficulty = "Mixed";

      if (numberOfQuestions > 0) {
        const maxCount = Math.max(
          difficultyCount.Easy,
          difficultyCount.Medium,
          difficultyCount.Hard
        );

        const entries = Object.entries(difficultyCount).filter(
          ([, count]) => count === maxCount
        );

        if (entries.length === 1) {
          overallDifficulty = entries[0][0];
        }
      }

      delete (testObj as { sections?: any }).sections;

      return {
        ...testObj,
        numberOfQuestions,
        overallDifficulty,
        subjectCount,
        difficultyCount,
      };
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limitNumber);
    const hasNextPage = pageNumber < totalPages;
    const hasPrevPage = pageNumber > 1;

    return {
      tests: testsWithCount,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalCount,
        limit: limitNumber,
        hasNextPage,
        hasPrevPage,
      },
      filters: {
        search,
        type,
        examType,
        subject,
        difficulty,
        sortBy,
        sortOrder,
        createdByRole
      }
    };
  };

  public getTestById = async (user: RequestUser, testId: string) => {
    const test = await TestModel.findById(testId);

    if (!test) {
      throw new ApiError(httpStatus.NOT_FOUND, "Test not found");
    }

    // Tutor access control
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

    const testObj = test.toObject();

    let flatQuestions: any[] = [];
    let numberOfQuestions = 0;
    const difficultyCount: Record<string, number> = {
      Easy: 0,
      Medium: 0,
      Hard: 0,
    };

    if (Array.isArray(testObj.sections)) {
      for (
        let sectionIndex = 0;
        sectionIndex < testObj.sections.length;
        sectionIndex++
      ) {
        const section = testObj.sections[sectionIndex];
        const subject = section.subject;

        if (Array.isArray(section.questions)) {
          for (
            let questionIndex = 0;
            questionIndex < section.questions.length;
            questionIndex++
          ) {
            const question = section.questions[questionIndex];
            const { correctAnswer, explanation, ...rest } = question;

            // Track difficulty
            if (question.difficulty) {
              difficultyCount[question.difficulty] =
                (difficultyCount[question.difficulty] || 0) + 1;
            }

            numberOfQuestions++;

            flatQuestions.push({
              ...rest,
              sectionIndex,
              questionIndex,
              section: subject,
            });
          }
        }
      }
    }

    // Calculate overall difficulty
    let overallDifficulty = "Mixed";
    if (numberOfQuestions > 0) {
      const maxCount = Math.max(
        difficultyCount.Easy,
        difficultyCount.Medium,
        difficultyCount.Hard
      );
      const entries = Object.entries(difficultyCount).filter(
        ([, count]) => count === maxCount
      );
      if (entries.length === 1) {
        overallDifficulty = entries[0][0];
      }
    }

    // Final payload adjustments
    delete (testObj as { sections?: any }).sections;
    (testObj as any).questions = flatQuestions;
    (testObj as any).overallDifficulty = overallDifficulty;
    (testObj as any).numberOfQuestions = numberOfQuestions;

    return testObj;
  };

  public submitTest = async (
    user: RequestUser,
    testId: string,
    data: {
      attemptedQuestions: {
        sectionIndex: number;
        questionIndex: number;
        selectedAnswer: string;
        timeTaken: number;
        answerHistory?: string[];
      }[];
    }
  ) => {
    const test = await TestModel.findById(testId);
    if (!test) {
      throw new ApiError(httpStatus.NOT_FOUND, "Test not found");
    }

    // Check attempt limit (max 3 attempts per test)
    const existingAttempts = await TestAttemptModel.countDocuments({
      user: user._id,
      test: testId,
    });

    if (existingAttempts >= 3) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Maximum attempt limit reached. You can only attempt this test 3 times."
      );
    }

    // Check access if test is from tutor
    if (test.createdByRole === "tutor") {
      const allowed = test.allowedStudents?.some(
        (id) => id.toString() === user._id.toString()
      );
      if (!allowed) {
        throw new ApiError(
          httpStatus.FORBIDDEN,
          "You do not have access to this test"
        );
      }
    }

    let totalQuestions = 0;
    for (const section of test.sections) {
      totalQuestions += section.questions.length;
    }

    let correctCount = 0;
    let totalTimeTaken = 0;
    let changedAnswersCount = 0;
    let changedCorrectCount = 0;

    const perSection: Record<number, SectionAnalytics> = {};
    const perSubject: Record<string, SubjectAnalytics> = {};
    const detailedAttempt: AttemptedQuestion[] = [];

    for (const attempt of data.attemptedQuestions) {
      const {
        sectionIndex,
        questionIndex,
        selectedAnswer,
        timeTaken,
        answerHistory = [],
      } = attempt;

      const section = test.sections[sectionIndex];
      if (!section) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Invalid sectionIndex: ${sectionIndex}`
        );
      }

      const question = section.questions[questionIndex];
      if (!question) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Invalid questionIndex ${questionIndex} in section ${sectionIndex}`
        );
      }

      const subject = section.subject;
      const isCorrect = question.correctAnswer === selectedAnswer;

      if (isCorrect) correctCount++;
      totalTimeTaken += timeTaken;

      if (answerHistory.length > 1) {
        changedAnswersCount++;
        if (isCorrect) {
          changedCorrectCount++;
        }
      }

      // Save to detailed attempts
      detailedAttempt.push({
        sectionIndex,
        questionIndex,
        selectedAnswer,
        answerHistory,
        isCorrect,
        timeTaken,
      });

      // Section Analytics
      if (!perSection[sectionIndex]) {
        perSection[sectionIndex] = {
          sectionIndex,
          subject,
          correct: 0,
          total: 0,
          avgTime: 0,
          accuracy: 0,
        };
      }
      perSection[sectionIndex].total++;
      if (isCorrect) perSection[sectionIndex].correct++;
      perSection[sectionIndex].avgTime += timeTaken;

      // Subject Analytics
      if (!perSubject[subject]) {
        perSubject[subject] = {
          subject,
          correct: 0,
          total: 0,
          avgTime: 0,
          accuracy: 0,
        };
      }
      perSubject[subject].total++;
      if (isCorrect) perSubject[subject].correct++;
      perSubject[subject].avgTime += timeTaken;
    }

    // Compute averages
    const sectionAnalytics: SectionAnalytics[] = Object.values(perSection).map(
      (sec) => ({
        ...sec,
        avgTime: sec.total > 0 ? sec.avgTime / sec.total : 0,
        accuracy: sec.total > 0 ? (sec.correct / sec.total) * 100 : 0,
      })
    );

    const subjectAnalytics: SubjectAnalytics[] = Object.values(perSubject).map(
      (subj) => ({
        ...subj,
        avgTime: subj.total > 0 ? subj.avgTime / subj.total : 0,
        accuracy: subj.total > 0 ? (subj.correct / subj.total) * 100 : 0,
      })
    );

    // incorrectCount should be the number of attempted but wrong answers
    const incorrectCount = detailedAttempt.filter(
      (a) =>
        a.selectedAnswer !== undefined &&
        a.selectedAnswer !== null &&
        a.selectedAnswer !== "" &&
        !a.isCorrect
    ).length;
    // Calculate score: +4 for correct, -1 for wrong, 0 for skipped
    let score = 0;
    let attemptedCount = 0;
    for (const attempt of detailedAttempt) {
      if (
        attempt.selectedAnswer === undefined ||
        attempt.selectedAnswer === null ||
        attempt.selectedAnswer === ""
      ) {
        // skipped
        continue;
      }
      attemptedCount++;
      if (attempt.isCorrect) {
        score += 4;
      } else {
        score -= 1;
      }
    }

    const scorePercent =
      totalQuestions > 0 ? (score / (totalQuestions * 4)) * 100 : 0;

    // Get slowest 5 questions
    const slowestQuestions = [...detailedAttempt]
      .sort((a, b) => b.timeTaken - a.timeTaken)
      .slice(0, 5);
    // Get fastest 5 questions (excluding skipped)
    const fastestQuestions = [...detailedAttempt]
      .filter(
        (a) =>
          a.selectedAnswer !== undefined &&
          a.selectedAnswer !== null &&
          a.selectedAnswer !== ""
      )
      .sort((a, b) => a.timeTaken - b.timeTaken)
      .slice(0, 5);

    const testAttempt = await TestAttemptModel.create({
      user: user._id,
      test: test._id,
      scorePercent,
      score,
      totalQuestions,
      correctCount,
      incorrectCount,
      totalTimeTaken,
      attemptedQuestions: detailedAttempt,
      sectionAnalytics,
      subjectAnalytics,
      slowestQuestions,
      fastestQuestions,
      changedAnswersCount,
      changedCorrectCount,
    });

    return testAttempt;
  };

  public getTestHistory = async (userId: string) => {
    const history = await TestAttemptModel.find({ user: userId })
      .populate("test", "title subject type examType")
      .sort({ attemptedAt: -1 });

    return history;
  };

  public getTestAttemptCount = async (userId: string, testId: string) => {
    const count = await TestAttemptModel.countDocuments({
      user: userId,
      test: testId,
    });
    return count;
  };

  public getAllTestAttempts = async (userId: string, testId: string) => {
    const attempts = await TestAttemptModel.find({
      user: userId,
      test: testId,
    })
      .populate("test", "title description examType type duration")
      .sort({ attemptedAt: 1 }); // oldest first

    return attempts;
  };

  public async getTestResultForTest(userId: string, testId: string) {
    const testAttempts = await TestAttemptModel.find({
      user: userId,
      test: testId,
    })
      .sort({ attemptedAt: 1 }) // oldest first
      .populate("test");

    if (testAttempts.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, "Test result not found");
    }

    const testResult = testAttempts[testAttempts.length - 1]; // latest attempt
    const test = testResult.test as any;

    // Flatten subject analytics
    const subjectAnalytics =
      testResult.subjectAnalytics?.map((s) => ({
        subject: s.subject,
        correct: s.correct,
        total: s.total,
        avgTime: s.avgTime,
        accuracy: s.accuracy,
      })) || [];

    // Flatten section analytics
    const sectionAnalytics =
      testResult.sectionAnalytics?.map((s) => ({
        sectionIndex: s.sectionIndex,
        subject: s.subject,
        correct: s.correct,
        total: s.total,
        avgTime: s.avgTime,
        accuracy: s.accuracy,
      })) || [];

    // Build time distribution
    const timeDistribution = [
      {
        name: "Under 30s",
        value: testResult.attemptedQuestions.filter((q) => q.timeTaken < 30)
          .length,
      },
      {
        name: "30s - 1m",
        value: testResult.attemptedQuestions.filter(
          (q) => q.timeTaken >= 30 && q.timeTaken < 60
        ).length,
      },
      {
        name: "1m - 2m",
        value: testResult.attemptedQuestions.filter(
          (q) => q.timeTaken >= 60 && q.timeTaken < 120
        ).length,
      },
      {
        name: "Over 2m",
        value: testResult.attemptedQuestions.filter((q) => q.timeTaken >= 120)
          .length,
      },
    ];

    // ------------------------
    // Changed answers analysis
    // ------------------------

    let changedAnswersCount = 0;
    let changedAndCorrectCount = 0;

    for (const q of testResult.attemptedQuestions) {
      if (q.answerHistory && q.answerHistory.length > 1) {
        changedAnswersCount++;
        if (q.isCorrect) {
          changedAndCorrectCount++;
        }
      }
    }

    const totalQuestions = testResult.totalQuestions;
    const correctCount = testResult.correctCount;
    const incorrectCount = testResult.incorrectCount;
    const skippedCount = totalQuestions - correctCount - incorrectCount;

    // ------------------------
    // Previous Attempts
    // ------------------------

    let previousAttemptsSummary: any[] = [];
    let improvementsBySubject: Record<string, number> = {};

    if (testAttempts.length > 1) {
      const previousAttempts = testAttempts.slice(0, testAttempts.length - 1);

      // Build summary table
      previousAttemptsSummary = previousAttempts.map((attempt, idx) => ({
        attemptNumber: idx + 1,
        date: attempt.attemptedAt,
        scorePercent: attempt.scorePercent,
        correctCount: attempt.correctCount,
        totalQuestions: attempt.totalQuestions,
        timeTaken: attempt.totalTimeTaken,
      }));

      // Compare subject-wise analytics
      const lastAttempt = previousAttempts[previousAttempts.length - 1];

      for (const current of subjectAnalytics) {
        const prev = lastAttempt.subjectAnalytics?.find(
          (s: any) => s.subject === current.subject
        );

        if (prev) {
          const improvement = current.accuracy - prev.accuracy;
          improvementsBySubject[current.subject] = improvement;
        }
      }
    }

    // Add improvement info to subject analytics
    const subjectAnalyticsDetailed = subjectAnalytics.map((subj) => {
      const difficulty =
        test.sections?.find((s: any) => s.subject === subj.subject)
          ?.difficulty || "Unknown";

      const improvement = improvementsBySubject[subj.subject] || 0;

      return {
        ...subj,
        difficulty,
        improvement,
      };
    });

    // ------------------------
    // Recommendations
    // ------------------------

    const weaknesses: string[] = [];
    const strengths: string[] = [];

    for (const subj of subjectAnalyticsDetailed) {
      if (subj.accuracy < 70) {
        weaknesses.push(subj.subject);
      } else if (subj.accuracy > 85) {
        strengths.push(subj.subject);
      }
    }

    const recommendations: string[] = [];

    if (weaknesses.length > 0) {
      for (const w of weaknesses) {
        recommendations.push(
          `${w}: Consider practicing more problems, focusing on accuracy and time management.`
        );
      }
    }

    if (strengths.length > 0) {
      for (const s of strengths) {
        recommendations.push(
          `${s}: Excellent performance! Keep practicing to maintain your strength.`
        );
      }
    }

    // Compute overall improvement vs previous attempt
    let overallImprovement = null;

    if (previousAttemptsSummary.length > 0) {
      const prevScore =
        previousAttemptsSummary[previousAttemptsSummary.length - 1]
          .scorePercent;
      const currScore = testResult.scorePercent;
      overallImprovement = currScore - prevScore;
    }

    const attemptMap = new Map<string, AttemptedQuestion>();
    for (const attempt of testResult.attemptedQuestions) {
      const key = `${attempt.sectionIndex}-${attempt.questionIndex}`;
      attemptMap.set(key, attempt);
    }

    const questionsData: any[] = [];
    let questionId = 1;

    for (
      let sectionIndex = 0;
      sectionIndex < test.sections.length;
      sectionIndex++
    ) {
      const section = test.sections[sectionIndex];

      for (
        let questionIndex = 0;
        questionIndex < section.questions.length;
        questionIndex++
      ) {
        const question = section.questions[questionIndex];
        const key = `${sectionIndex}-${questionIndex}`;
        const attempt = attemptMap.get(key);

        const options = ["A", "B", "C", "D"];
        const correctAnswerIndex =
          options?.indexOf(question.correctAnswer) ?? -1;

        let userAnswerIndex: number | null = null;

        if (attempt) {
          // If selectedAnswer is a letter, convert to index
          const idx = options.indexOf(attempt.selectedAnswer);
          userAnswerIndex = idx >= 0 ? idx : null;
        }

        questionsData.push({
          id: questionId++,
          subject: section.subject,
          question: question.questionText,
          options: question.options,
          correctAnswer: correctAnswerIndex >= 0 ? correctAnswerIndex : null,
          userAnswer: attempt ? userAnswerIndex : null,
          explanation: question.explanation || "",
          timeSpent: attempt?.timeTaken ?? 0,
          difficulty: question.difficulty,
          status: attempt
            ? attempt.selectedAnswer == null
              ? "skipped"
              : attempt.isCorrect
              ? "correct"
              : "incorrect"
            : "skipped",
        });
      }
    }
    return {
      _id: testResult._id,
      scorePercent: testResult.scorePercent,
      totalQuestions,
      correctCount,
      incorrectCount,
      skippedCount,
      score: testResult.score,
      totalTimeTaken: testResult.totalTimeTaken,
      attemptedAt: testResult.attemptedAt,
      changedAnswers: {
        totalChanged: changedAnswersCount,
        correctAfterChange: changedAndCorrectCount,
      },
      test: {
        _id: test._id,
        title: test.title,
        description: test.description,
        examType: test.examType,
        type: test.type,
        duration: test.duration,
        sections: test.sections?.map((section: any) => ({
          subject: section.subject,
          totalQuestions: section.questions?.length || 0,
          difficulty: section.difficulty,
        })),
        createdBy: test.createdBy,
        isPublished: test.isPublished,
        isPurchased: test.isPurchased,
      },
      attemptedQuestions: testResult.attemptedQuestions,
      questionsData,
      subjectAnalytics: subjectAnalyticsDetailed,
      sectionAnalytics,
      slowestQuestions: testResult.slowestQuestions,
      questionAnalysis: {
        timeDistribution,
      },
      personalizedRecommendations: recommendations,
      previousAttempts: previousAttemptsSummary,
      overallImprovement,
    };
  }
}

export default new TestService();
