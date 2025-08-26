import express from 'express';
import authMiddleware from '../middlewares/auth.middleware';
import {
  getDashboardStats,
  getRecentActivities,
  getSubjectProgress,
  getUpcomingTests,
  getStudyStreak,
  getPerformanceAnalytics
} from '../controllers/dashboardController';

const router = express.Router();

// Apply authentication middleware to all dashboard routes
router.use(authMiddleware.authenticate);

// Dashboard statistics
router.get('/stats', getDashboardStats);

// Recent activities
router.get('/activities', getRecentActivities);

// Subject-wise progress
router.get('/subject-progress', getSubjectProgress);

// Upcoming/recommended tests
router.get('/upcoming-tests', getUpcomingTests);

// Study streak information
router.get('/streak', getStudyStreak);

// Performance analytics
router.get('/performance', getPerformanceAnalytics);

export default router;
