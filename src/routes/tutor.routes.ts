import express from 'express';
import {
  getTutors,
  getTutorStats,
  getTutor,
  updateTutorStatus,
  verifyTutor,
  deleteTutor,
  sendNotification,
  bulkUpdateTutors,
} from '../controllers/tutor.controller';

const router = express.Router();

/**
 * @swagger
 * /api/v1/admin/tutors:
 *   get:
 *     summary: Get all tutors with filtering and pagination
 *     tags: [Admin - Tutors]
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
 *         description: Number of tutors per page
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
 *         description: Filter by status (based on isEmailVerified)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, name, email]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Tutors retrieved successfully
 */
router.get('/', getTutors);

/**
 * @swagger
 * /api/v1/admin/tutors/stats:
 *   get:
 *     summary: Get tutor statistics
 *     tags: [Admin - Tutors]
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/stats', getTutorStats);

/**
 * @swagger
 * /api/v1/admin/tutors/{tutorId}:
 *   get:
 *     summary: Get tutor by ID
 *     tags: [Admin - Tutors]
 *     parameters:
 *       - in: path
 *         name: tutorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tutor ID
 *     responses:
 *       200:
 *         description: Tutor retrieved successfully
 *       404:
 *         description: Tutor not found
 */
router.get('/:tutorId', getTutor);

/**
 * @swagger
 * /api/v1/admin/tutors/{tutorId}/status:
 *   patch:
 *     summary: Update tutor status (email verification)
 *     tags: [Admin - Tutors]
 *     parameters:
 *       - in: path
 *         name: tutorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tutor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       404:
 *         description: Tutor not found
 */
router.patch('/:tutorId/status', updateTutorStatus);

/**
 * @swagger
 * /api/v1/admin/tutors/{tutorId}/verify:
 *   patch:
 *     summary: Update tutor verification status
 *     tags: [Admin - Tutors]
 *     parameters:
 *       - in: path
 *         name: tutorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tutor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isVerified
 *             properties:
 *               isVerified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Verification status updated successfully
 *       404:
 *         description: Tutor not found
 */
router.patch('/:tutorId/verify', verifyTutor);

/**
 * @swagger
 * /api/v1/admin/tutors/{tutorId}:
 *   delete:
 *     summary: Delete tutor
 *     tags: [Admin - Tutors]
 *     parameters:
 *       - in: path
 *         name: tutorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tutor ID
 *     responses:
 *       200:
 *         description: Tutor deleted successfully
 *       404:
 *         description: Tutor not found
 */
router.delete('/:tutorId', deleteTutor);

/**
 * @swagger
 * /api/v1/admin/tutors/notify:
 *   post:
 *     summary: Send notification to multiple tutors
 *     tags: [Admin - Tutors]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tutorIds
 *               - subject
 *               - message
 *             properties:
 *               tutorIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of tutor IDs
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
 *         description: Validation error
 *       404:
 *         description: Some tutors not found
 */
router.post('/notify', sendNotification);

/**
 * @swagger
 * /api/v1/admin/tutors/bulk:
 *   patch:
 *     summary: Bulk update tutors
 *     tags: [Admin - Tutors]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tutorIds
 *               - updateData
 *             properties:
 *               tutorIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of tutor IDs
 *               updateData:
 *                 type: object
 *                 description: Data to update
 *     responses:
 *       200:
 *         description: Tutors updated successfully
 *       400:
 *         description: Validation error
 */
router.patch('/bulk', bulkUpdateTutors);

export default router;
