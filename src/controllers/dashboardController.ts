import { Request, Response, NextFunction } from 'express';
import TestAttempt from '../models/testAttempt.model';
import Test from '../models/test.model';
import User from '../models/user.model';
import { RequestWithUser } from '../interfaces/request.interface';
import mongoose from 'mongoose';

// Get dashboard statistics
export const getDashboardStats = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    // Get user's test attempts
    const userAttempts = await TestAttempt.find({ user: userId }).populate('test');
    
    // Get all available tests
    const totalTests = await Test.countDocuments({ isPublished: true });
    
    // Calculate basic statistics
    const testsCompleted = new Set(userAttempts.map(attempt => (attempt.test as any)._id.toString())).size;
    
    const scores = userAttempts.map(attempt => attempt.scorePercent);
    const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
    
    // Calculate total time taken (in minutes)
    const totalTimeTaken = Math.round(userAttempts.reduce((total, attempt) => total + attempt.totalTimeTaken, 0) / 60);
    
    // Simple streak calculation
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    const attemptDates = userAttempts.map(attempt => new Date(attempt.attemptedAt).toDateString());
    const hasRecentActivity = attemptDates.includes(today) || attemptDates.includes(yesterday);
    const streak = hasRecentActivity ? 1 : 0; // Simplified for now
    
    // Get user's current coins
    const user = await User.findById(userId);
    const coins = user?.coins || 0;
    
    // Simple ranking (can be enhanced later)
    const rank = 1;
    const totalStudents = await User.countDocuments({ role: 'student' });

    const stats = {
      totalTests,
      testsCompleted,
      averageScore,
      bestScore,
      totalTimeTaken,
      streak,
      coins,
      rank,
      totalStudents
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    next(error);
  }
};

// Get recent activities
export const getRecentActivities = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    // Get recent test attempts
    const recentAttempts = await TestAttempt.find({ user: userId })
      .populate('test', 'title _id')
      .sort({ attemptedAt: -1 })
      .limit(limit);

    const activities = recentAttempts.map(attempt => ({
      _id: attempt._id,
      type: 'test_completed',
      title: `Completed ${(attempt.test as any).title}`,
      description: `Scored ${attempt.scorePercent}% with ${attempt.correctCount}/${attempt.totalQuestions} correct answers`,
      score: attempt.scorePercent,
      coins: Math.round(attempt.scorePercent / 10), // Simple coin calculation
      createdAt: attempt.attemptedAt,
      testId: (attempt.test as any)._id
    }));

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    next(error);
  }
};

// Get subject-wise progress
export const getSubjectProgress = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    // Get user's test attempts with populated test data
    const attempts = await TestAttempt.find({ user: userId }).populate('test');

    // Simple subject grouping based on subjectAnalytics if available
    const subjectStats: { [key: string]: any } = {};

    attempts.forEach(attempt => {
      if (attempt.subjectAnalytics && attempt.subjectAnalytics.length > 0) {
        attempt.subjectAnalytics.forEach(subjectData => {
          const subject = subjectData.subject;
          
          if (!subjectStats[subject]) {
            subjectStats[subject] = {
              subject,
              totalQuestions: 0,
              correctAnswers: 0,
              totalTime: 0,
              attempts: 0
            };
          }

          subjectStats[subject].totalQuestions += subjectData.total;
          subjectStats[subject].correctAnswers += subjectData.correct;
          subjectStats[subject].totalTime += subjectData.avgTime * subjectData.total;
          subjectStats[subject].attempts += 1;
        });
      }
    });

    // Calculate final metrics
    const subjectProgress = Object.values(subjectStats).map((stats: any) => {
      const accuracy = stats.totalQuestions > 0 ? (stats.correctAnswers / stats.totalQuestions) * 100 : 0;
      const averageTime = stats.totalQuestions > 0 ? Math.round(stats.totalTime / stats.totalQuestions) : 0;
      
      return {
        subject: stats.subject,
        totalQuestions: stats.totalQuestions,
        correctAnswers: stats.correctAnswers,
        accuracy: Math.round(accuracy * 10) / 10,
        averageTime,
        improvement: 0 // Simplified for now
      };
    });

    res.json({
      success: true,
      data: subjectProgress
    });
  } catch (error) {
    console.error('Error fetching subject progress:', error);
    next(error);
  }
};

// Get upcoming/recommended tests
export const getUpcomingTests = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const limit = parseInt(req.query.limit as string) || 5;
    
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    // Get user's completed tests
    const userAttempts = await TestAttempt.find({ user: userId }).distinct('test');
    
    // Get available tests
    const availableTests = await Test.find({
      isPublished: true
    }).limit(limit * 2);

    // Simple recommendation logic
    const recommendedTests = availableTests.map(test => {
      const hasAttempted = userAttempts.some(attemptedTestId => 
        attemptedTestId.toString() === (test as any)._id.toString()
      );
      
      // Count questions in sections
      let questionsCount = 0;
      if ((test as any).sections && Array.isArray((test as any).sections)) {
        questionsCount = (test as any).sections.reduce((total: number, section: any) => 
          total + (section.questions?.length || 0), 0);
      }
      
      return {
        _id: (test as any)._id,
        title: (test as any).title,
        description: (test as any).description,
        examType: (test as any).examType,
        duration: (test as any).duration,
        difficulty: 'Medium', // Default difficulty
        questionsCount,
        isRecommended: !hasAttempted, // Recommend if not attempted
        scheduledFor: null
      };
    })
    .sort((a, b) => {
      // Sort by recommendation status
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;
      return 0;
    })
    .slice(0, limit);

    res.json({
      success: true,
      data: recommendedTests
    });
  } catch (error) {
    console.error('Error fetching upcoming tests:', error);
    next(error);
  }
};

// Get study streak information
export const getStudyStreak = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    // Get user's test attempts for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentAttempts = await TestAttempt.find({
      user: userId,
      attemptedAt: { $gte: thirtyDaysAgo }
    }).sort({ attemptedAt: 1 });

    // Group attempts by date
    const attemptsByDate: { [key: string]: any[] } = {};
    recentAttempts.forEach(attempt => {
      const dateStr = new Date(attempt.attemptedAt).toISOString().split('T')[0];
      if (!attemptsByDate[dateStr]) {
        attemptsByDate[dateStr] = [];
      }
      attemptsByDate[dateStr].push(attempt);
    });

    // Simple streak calculation
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    let currentStreak = 0;
    if (attemptsByDate[today]) {
      currentStreak = 1;
    } else if (attemptsByDate[yesterday]) {
      currentStreak = 1;
    }

    // Calculate longest streak (simplified)
    const longestStreak = Math.max(currentStreak, Object.keys(attemptsByDate).length > 5 ? 5 : Object.keys(attemptsByDate).length);

    // Create streak history for the last 14 days
    const streakHistory = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayAttempts = attemptsByDate[dateStr] || [];
      streakHistory.push({
        date: dateStr,
        testsCompleted: dayAttempts.length,
        timeSpent: dayAttempts.reduce((total, attempt) => total + attempt.totalTimeTaken, 0)
      });
    }

    const lastActivityDate = recentAttempts.length > 0 
      ? recentAttempts[recentAttempts.length - 1].attemptedAt 
      : null;

    const streakData = {
      currentStreak,
      longestStreak,
      lastActivityDate,
      streakHistory
    };

    res.json({
      success: true,
      data: streakData
    });
  } catch (error) {
    console.error('Error fetching study streak:', error);
    next(error);
  }
};

// Get performance analytics
export const getPerformanceAnalytics = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const period = req.query.period as string || '30d';
    
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    // Calculate date range
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get user's attempts in the period
    const attempts = await TestAttempt.find({
      user: userId,
      attemptedAt: { $gte: startDate }
    }).populate('test').sort({ attemptedAt: 1 });

    // Score history
    const scoreHistory = attempts.map(attempt => ({
      date: attempt.attemptedAt,
      score: attempt.scorePercent
    }));

    // Simple subject performance based on subjectAnalytics
    const subjectData: any[] = [];
    if (attempts.length > 0 && attempts[0].subjectAnalytics) {
      const subjectMap: { [key: string]: number[] } = {};
      
      attempts.forEach(attempt => {
        if (attempt.subjectAnalytics) {
          attempt.subjectAnalytics.forEach(subject => {
            if (!subjectMap[subject.subject]) {
              subjectMap[subject.subject] = [];
            }
            subjectMap[subject.subject].push(subject.accuracy);
          });
        }
      });

      Object.entries(subjectMap).forEach(([subject, accuracies]) => {
        subjectData.push({
          subject,
          accuracy: Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length)
        });
      });
    }

    // Time spent analysis
    const timeSpent = attempts.reduce((acc, attempt) => {
      const date = attempt.attemptedAt.toISOString().split('T')[0];
      const existing = acc.find(item => item.date === date);
      if (existing) {
        existing.hours += attempt.totalTimeTaken / 3600;
      } else {
        acc.push({
          date,
          hours: Math.round((attempt.totalTimeTaken / 3600) * 10) / 10
        });
      }
      return acc;
    }, [] as any[]);

    // Calculate analytics
    const scores = attempts.map(a => a.scorePercent);
    const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const improvement = scores.length >= 2 ? scores[scores.length - 1] - scores[0] : 0;

    const totalHours = Math.round(attempts.reduce((total, attempt) => total + attempt.totalTimeTaken, 0) / 3600);
    const averageSessionTime = attempts.length > 0 ? Math.round(totalHours * 60 / attempts.length) : 0;
    
    // Consistency (percentage of days with activity)
    const activeDays = new Set(attempts.map(a => a.attemptedAt.toISOString().split('T')[0])).size;
    const consistency = Math.round((activeDays / days) * 100);

    const analytics = {
      scoreHistory,
      subjectPerformance: subjectData,
      timeSpent,
      averageScore,
      bestScore,
      improvement: Math.round(improvement),
      strongestSubject: subjectData.length > 0 ? subjectData.reduce((a, b) => a.accuracy > b.accuracy ? a : b).subject : 'N/A',
      weakestSubject: subjectData.length > 0 ? subjectData.reduce((a, b) => a.accuracy < b.accuracy ? a : b).subject : 'N/A',
      totalHours,
      averageSessionTime,
      consistency
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching performance analytics:', error);
    next(error);
  }
};
