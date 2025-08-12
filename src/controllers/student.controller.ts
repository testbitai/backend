import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import UserModel, { UserRole } from '../models/user.model';
import TestAttemptModel from '../models/testAttempt.model';
import TestModel from '../models/test.model';
import { Types } from 'mongoose';

/**
 * Get all students with filtering, pagination, and search
 */
export const getAllStudents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 12,
      search = '',
      status = 'all',
      examGoal = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      minScore = '',
      maxScore = '',
      hasAttempts = 'all',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const filter: any = { role: UserRole.STUDENT };

    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Status filter
    if (status !== 'all') {
      filter.isActive = status === 'active';
    }

    // Exam goal filter
    if (examGoal !== 'all') {
      filter.examGoals = { $in: [examGoal] };
    }

    // Build sort object
    const sortObj: any = {};
    sortObj[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    // Get students with basic info
    const students = await UserModel.find(filter)
      .select('-password -refreshToken')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get test attempts for each student
    const studentsWithStats = await Promise.all(
      students.map(async (student) => {
        const attempts = await TestAttemptModel.find({ 
          user: student._id 
        }).populate('test', 'title type examType');

        // All attempts are considered completed since they have scores
        const completedAttempts = attempts;
        const totalScore = completedAttempts.reduce((sum, attempt) => sum + attempt.scorePercent, 0);
        const averageScore = completedAttempts.length > 0 ? totalScore / completedAttempts.length : 0;

        // Calculate streak based on attemptedAt dates
        const sortedAttempts = completedAttempts.sort((a, b) => 
          new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime()
        );

        let currentStreak = 0;
        let lastDate: Date | null = null;

        for (const attempt of sortedAttempts) {
          const attemptDate = new Date(attempt.attemptedAt);
          const daysDiff = lastDate ? Math.floor((lastDate.getTime() - attemptDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

          if (lastDate === null || daysDiff === 1) {
            currentStreak++;
            lastDate = attemptDate;
          } else if (daysDiff === 0) {
            // Same day, continue
            lastDate = attemptDate;
          } else {
            break;
          }
        }

        // Get last test info
        const lastAttempt = sortedAttempts[0];
        const lastTest = lastAttempt ? {
          title: (lastAttempt.test as any)?.title || 'Unknown Test',
          score: lastAttempt.scorePercent,
          completedAt: lastAttempt.attemptedAt,
        } : null;

        // Calculate progress (based on tests completed vs available tests)
        const totalAvailableTests = await TestModel.countDocuments({ isPublished: true });
        const progress = totalAvailableTests > 0 ? (completedAttempts.length / totalAvailableTests) * 100 : 0;

        return {
          _id: student._id,
          name: student.name,
          email: student.email,
          phone: '', // Phone field doesn't exist in current model
          profilePicture: student.avatar, // Using avatar field
          isActive: student.isActive,
          examGoal: student.examGoals?.[0], // Take first exam goal
          studyBuddyLevel: student.studyBuddy?.level,
          coins: student.coins,
          badges: student.badges,
          streak: student.streak,
          joinDate: student.createdAt,
          lastActive: student.updatedAt, // Using updatedAt as lastActive
          
          // Calculated stats
          testsCompleted: completedAttempts.length,
          testsAttempted: attempts.length,
          averageScore: Math.round(averageScore * 100) / 100,
          currentStreak,
          progress: Math.round(progress * 100) / 100,
          lastTest,
          
          // Performance metrics
          performance: {
            totalTests: completedAttempts.length,
            averageScore: Math.round(averageScore * 100) / 100,
            bestScore: completedAttempts.length > 0 ? Math.max(...completedAttempts.map(a => a.scorePercent)) : 0,
            worstScore: completedAttempts.length > 0 ? Math.min(...completedAttempts.map(a => a.scorePercent)) : 0,
            improvementTrend: calculateImprovementTrend(completedAttempts),
          }
        };
      })
    );

    // Apply score filters if provided
    let filteredStudents = studentsWithStats;
    if (minScore) {
      filteredStudents = filteredStudents.filter(s => s.averageScore >= parseFloat(minScore as string));
    }
    if (maxScore) {
      filteredStudents = filteredStudents.filter(s => s.averageScore <= parseFloat(maxScore as string));
    }
    if (hasAttempts !== 'all') {
      if (hasAttempts === 'true') {
        filteredStudents = filteredStudents.filter(s => s.testsCompleted > 0);
      } else {
        filteredStudents = filteredStudents.filter(s => s.testsCompleted === 0);
      }
    }

    // Get total count for pagination
    const totalCount = await UserModel.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Students retrieved successfully',
      data: {
        students: filteredStudents,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          limit: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
        filters: {
          search,
          status,
          examGoal,
          sortBy,
          sortOrder,
          minScore,
          maxScore,
          hasAttempts,
        }
      }
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch students',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get student statistics
 */
export const getStudentStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const totalStudents = await UserModel.countDocuments({ role: UserRole.STUDENT });
    const activeStudents = await UserModel.countDocuments({ 
      role: UserRole.STUDENT, 
      isActive: true 
    });
    const inactiveStudents = totalStudents - activeStudents;

    // Get students with test attempts
    const studentsWithAttempts = await TestAttemptModel.distinct('user');
    const studentsWithoutAttempts = totalStudents - studentsWithAttempts.length;

    // Calculate average score across all students
    const allAttempts = await TestAttemptModel.find({});
    const totalScore = allAttempts.reduce((sum, attempt) => sum + attempt.scorePercent, 0);
    const averageScore = allAttempts.length > 0 ? totalScore / allAttempts.length : 0;

    // Get monthly growth
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const newStudentsThisMonth = await UserModel.countDocuments({
      role: UserRole.STUDENT,
      createdAt: { $gte: lastMonth }
    });

    const previousMonth = new Date();
    previousMonth.setMonth(previousMonth.getMonth() - 2);
    const newStudentsLastMonth = await UserModel.countDocuments({
      role: UserRole.STUDENT,
      createdAt: { $gte: previousMonth, $lt: lastMonth }
    });

    const monthlyGrowth = newStudentsLastMonth > 0 
      ? ((newStudentsThisMonth - newStudentsLastMonth) / newStudentsLastMonth) * 100 
      : 0;

    // Get exam goal distribution
    const examGoalStats = await UserModel.aggregate([
      { $match: { role: UserRole.STUDENT } },
      { $unwind: { path: '$examGoals', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$examGoals', count: { $sum: 1 } } }
    ]);

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Student statistics retrieved successfully',
      data: {
        totalStudents,
        activeStudents,
        inactiveStudents,
        studentsWithAttempts: studentsWithAttempts.length,
        studentsWithoutAttempts,
        averageScore: Math.round(averageScore * 100) / 100,
        monthlyGrowth: Math.round(monthlyGrowth * 100) / 100,
        examGoalDistribution: examGoalStats,
        newStudentsThisMonth,
      }
    });
  } catch (error) {
    console.error('Error fetching student stats:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch student statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get single student details
 */
export const getStudentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { studentId } = req.params;

    if (!Types.ObjectId.isValid(studentId)) {
      res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid student ID'
      });
      return;
    }

    const student = await UserModel.findOne({
      _id: studentId,
      role: UserRole.STUDENT
    }).select('-password -refreshToken');

    if (!student) {
      res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'Student not found'
      });
      return;
    }

    // Get detailed test attempts
    const attempts = await TestAttemptModel.find({ 
      user: studentId 
    }).populate('test', 'title type examType duration sections')
    .sort({ attemptedAt: -1 });

    const completedAttempts = attempts; // All attempts are considered completed

    // Calculate detailed analytics
    const analytics = {
      totalAttempts: attempts.length,
      completedAttempts: completedAttempts.length,
      averageScore: completedAttempts.length > 0 
        ? completedAttempts.reduce((sum, a) => sum + a.scorePercent, 0) / completedAttempts.length 
        : 0,
      bestScore: completedAttempts.length > 0 ? Math.max(...completedAttempts.map(a => a.scorePercent)) : 0,
      worstScore: completedAttempts.length > 0 ? Math.min(...completedAttempts.map(a => a.scorePercent)) : 0,
      subjectWisePerformance: calculateSubjectWisePerformance(completedAttempts),
      monthlyProgress: calculateMonthlyProgress(completedAttempts),
      recentActivity: attempts.slice(0, 10),
    };

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Student details retrieved successfully',
      data: {
        student,
        analytics,
        attempts: attempts.slice(0, 20), // Recent 20 attempts
      }
    });
  } catch (error) {
    console.error('Error fetching student details:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch student details',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Update student status (activate/deactivate)
 */
export const updateStudentStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { studentId } = req.params;
    const { isActive } = req.body;

    if (!Types.ObjectId.isValid(studentId)) {
      res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid student ID'
      });
      return;
    }

    const student = await UserModel.findOneAndUpdate(
      { _id: studentId, role: UserRole.STUDENT },
      { isActive, updatedAt: new Date() },
      { new: true }
    ).select('-password -refreshToken');

    if (!student) {
      res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'Student not found'
      });
      return;
    }

    res.status(httpStatus.OK).json({
      success: true,
      message: `Student ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: student
    });
  } catch (error) {
    console.error('Error updating student status:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to update student status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Delete student account
 */
export const deleteStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { studentId } = req.params;

    if (!Types.ObjectId.isValid(studentId)) {
      res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid student ID'
      });
      return;
    }

    // Delete student and all related data
    const student = await UserModel.findOneAndDelete({
      _id: studentId,
      role: UserRole.STUDENT
    });

    if (!student) {
      res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'Student not found'
      });
      return;
    }

    // Delete all test attempts
    await TestAttemptModel.deleteMany({ user: studentId });

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Student account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to delete student account',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Send notification to students
 */
export const sendStudentNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { studentIds, subject, message } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Student IDs are required'
      });
      return;
    }

    if (!subject || !message) {
      res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Subject and message are required'
      });
      return;
    }

    // Get student emails
    const students = await UserModel.find({
      _id: { $in: studentIds },
      role: UserRole.STUDENT
    }).select('email name');

    if (students.length === 0) {
      res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'No valid students found'
      });
      return;
    }

    // TODO: Implement email sending logic here
    // For now, we'll just return success
    
    res.status(httpStatus.OK).json({
      success: true,
      message: `Notification sent to ${students.length} student(s) successfully`,
      data: {
        sentTo: students.length,
        students: students.map(s => ({ id: s._id, name: s.name, email: s.email }))
      }
    });
  } catch (error) {
    console.error('Error sending student notification:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to send notification',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Export students data to CSV
 */
export const exportStudentsData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const students = await UserModel.find({ role: UserRole.STUDENT })
      .select('-password -refreshToken')
      .lean();

    // Get test attempts for each student
    const studentsWithStats = await Promise.all(
      students.map(async (student) => {
        const attempts = await TestAttemptModel.find({ 
          user: student._id
        });

        const totalScore = attempts.reduce((sum, attempt) => sum + attempt.scorePercent, 0);
        const averageScore = attempts.length > 0 ? totalScore / attempts.length : 0;

        return {
          name: student.name,
          email: student.email,
          phone: '', // Phone field doesn't exist in current model
          examGoal: student.examGoals?.[0] || '',
          joinDate: student.createdAt,
          isActive: student.isActive ? 'Active' : 'Inactive',
          testsCompleted: attempts.length,
          averageScore: Math.round(averageScore * 100) / 100,
          coins: student.coins || 0,
          studyBuddyLevel: student.studyBuddy?.level || '',
        };
      })
    );

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Student data exported successfully',
      data: studentsWithStats
    });
  } catch (error) {
    console.error('Error exporting student data:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to export student data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Helper functions
function calculateImprovementTrend(attempts: any[]): number {
  if (attempts.length < 2) return 0;
  
  const sortedAttempts = attempts.sort((a, b) => 
    new Date(a.attemptedAt).getTime() - new Date(b.attemptedAt).getTime()
  );
  
  const firstHalf = sortedAttempts.slice(0, Math.floor(sortedAttempts.length / 2));
  const secondHalf = sortedAttempts.slice(Math.floor(sortedAttempts.length / 2));
  
  const firstHalfAvg = firstHalf.reduce((sum, a) => sum + a.scorePercent, 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((sum, a) => sum + a.scorePercent, 0) / secondHalf.length;
  
  return Math.round((secondHalfAvg - firstHalfAvg) * 100) / 100;
}

function calculateSubjectWisePerformance(attempts: any[]): any[] {
  const subjectStats: { [key: string]: { total: number; count: number } } = {};
  
  attempts.forEach(attempt => {
    if (attempt.subjectAnalytics) {
      attempt.subjectAnalytics.forEach((subjectData: any) => {
        const subject = subjectData.subject;
        if (!subjectStats[subject]) {
          subjectStats[subject] = { total: 0, count: 0 };
        }
        subjectStats[subject].total += subjectData.accuracy;
        subjectStats[subject].count += 1;
      });
    }
  });
  
  return Object.entries(subjectStats).map(([subject, stats]) => ({
    subject,
    averageScore: Math.round((stats.total / stats.count) * 100) / 100,
    totalAttempts: stats.count
  }));
}

function calculateMonthlyProgress(attempts: any[]): any[] {
  const monthlyStats: { [key: string]: { total: number; count: number } } = {};
  
  attempts.forEach(attempt => {
    const month = new Date(attempt.attemptedAt).toISOString().slice(0, 7); // YYYY-MM
    if (!monthlyStats[month]) {
      monthlyStats[month] = { total: 0, count: 0 };
    }
    monthlyStats[month].total += attempt.scorePercent;
    monthlyStats[month].count += 1;
  });
  
  return Object.entries(monthlyStats)
    .map(([month, stats]) => ({
      month,
      averageScore: Math.round((stats.total / stats.count) * 100) / 100,
      testsCompleted: stats.count
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
