import { Router } from 'express';
import {
  getAllStudents,
  getStudentStats,
  getStudentById,
  updateStudentStatus,
  deleteStudent,
  sendStudentNotification,
  exportStudentsData,
} from '../controllers/student.controller';
import authMiddleware from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';
import {
  getAllStudentsValidation,
  updateStudentStatusValidation,
  sendStudentNotificationValidation,
} from '../validations/student.validation';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware.authenticate);

/**
 * @swagger
 * /api/v1/admin/students:
 *   get:
 *     summary: Get all students with filtering and pagination
 *     tags: [Admin - Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 12
 *         description: Number of students per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, active, inactive]
 *           default: all
 *         description: Filter by status
 *       - in: query
 *         name: examGoal
 *         schema:
 *           type: string
 *           enum: [all, JEE, BITSAT]
 *           default: all
 *         description: Filter by exam goal
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, name, email, averageScore]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: minScore
 *         schema:
 *           type: number
 *         description: Minimum average score filter
 *       - in: query
 *         name: maxScore
 *         schema:
 *           type: number
 *         description: Maximum average score filter
 *       - in: query
 *         name: hasAttempts
 *         schema:
 *           type: string
 *           enum: [all, true, false]
 *           default: all
 *         description: Filter by test attempts
 *     responses:
 *       200:
 *         description: Students retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', validate(getAllStudentsValidation), getAllStudents);

/**
 * @swagger
 * /api/v1/admin/students/stats:
 *   get:
 *     summary: Get student statistics
 *     tags: [Admin - Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/stats', getStudentStats);

/**
 * @swagger
 * /api/v1/admin/students/export:
 *   get:
 *     summary: Export students data to CSV
 *     tags: [Admin - Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student data exported successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/export', exportStudentsData);

/**
 * @swagger
 * /api/v1/admin/students/{studentId}:
 *   get:
 *     summary: Get student details by ID
 *     tags: [Admin - Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Student details retrieved successfully
 *       400:
 *         description: Invalid student ID
 *       404:
 *         description: Student not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/:studentId', getStudentById);

/**
 * @swagger
 * /api/v1/admin/students/{studentId}/status:
 *   patch:
 *     summary: Update student status
 *     tags: [Admin - Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 description: Student active status
 *     responses:
 *       200:
 *         description: Student status updated successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Student not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.patch('/:studentId/status', validate(updateStudentStatusValidation), updateStudentStatus);

/**
 * @swagger
 * /api/v1/admin/students/{studentId}:
 *   delete:
 *     summary: Delete student account
 *     tags: [Admin - Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Student deleted successfully
 *       400:
 *         description: Invalid student ID
 *       404:
 *         description: Student not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete('/:studentId', deleteStudent);

/**
 * @swagger
 * /api/v1/admin/students/notify:
 *   post:
 *     summary: Send notification to multiple students
 *     tags: [Admin - Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentIds
 *               - subject
 *               - message
 *             properties:
 *               studentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of student IDs
 *               subject:
 *                 type: string
 *                 description: Notification subject
 *               message:
 *                 type: string
 *                 description: Notification message
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: No valid students found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/notify', validate(sendStudentNotificationValidation), sendStudentNotification);

export default router;
