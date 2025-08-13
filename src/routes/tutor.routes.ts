import express from 'express';
import tutorController from '../controllers/tutor.controller';
import authMiddleware from '../middlewares/auth.middleware';

const router = express.Router();

/**
 * @swagger
 * /api/v1/admin/tutors:
 *   get:
 *     summary: Get all tutors with filtering and pagination
 *     tags: [Admin - Tutors]
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
 *           enum: [active, inactive, pending, cancelled]
 *           default: all
 *         description: Filter by subscription status
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */

router.get('/', 
  authMiddleware.authenticate,
  authMiddleware.authorizeRoles('admin'),
  tutorController.getAllTutors
);

/**
 * @swagger
 * /api/v1/admin/tutors/stats:
 *   get:
 *     summary: Get tutor statistics
 *     tags: [Admin - Tutors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tutor statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/stats', 
  authMiddleware.authenticate,
  authMiddleware.authorizeRoles('admin'),
  tutorController.getTutorStats
);

/**
 * @swagger
 * /api/v1/admin/tutors/{tutorId}:
 *   get:
 *     summary: Get tutor by ID
 *     tags: [Admin - Tutors]
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Tutor not found
 */
router.get('/:tutorId', 
  authMiddleware.authenticate,
  authMiddleware.authorizeRoles('admin'),
  tutorController.getTutorById
);

/**
 * @swagger
 * /api/v1/admin/tutors/{tutorId}/verify:
 *   patch:
 *     summary: Update tutor verification status
 *     tags: [Admin - Tutors]
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Tutor not found
 */
router.patch('/:tutorId/verify', 
  authMiddleware.authenticate,
  authMiddleware.authorizeRoles('admin'),
  tutorController.verifyTutor
);

/**
 * @swagger
 * /api/v1/admin/tutors/{tutorId}/subscription:
 *   patch:
 *     summary: Update tutor subscription status
 *     tags: [Admin - Tutors]
 *     security:
 *       - bearerAuth: []
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
 *                 enum: [active, inactive, pending, cancelled]
 *               paymentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Subscription status updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Tutor not found
 */
router.patch('/:tutorId/subscription', 
  authMiddleware.authenticate,
  authMiddleware.authorizeRoles('admin'),
  tutorController.updateSubscription
);

export default router;
