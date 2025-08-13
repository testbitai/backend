import express from 'express';
import studentManagementController from '../controllers/studentManagement.controller';
import authMiddleware from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const generateInviteSchema = Joi.object({
  body: Joi.object({
    message: Joi.string().max(500).optional(),
    expiresIn: Joi.number().min(1).max(30).optional(), // 1-30 days
  }),
});

const updateInvitationStatusSchema = Joi.object({
  body: Joi.object({
    status: Joi.string().valid('accepted', 'rejected').required(),
    reason: Joi.string().max(500).optional(),
  }),
});

const getStudentsSchema = Joi.object({
  query: Joi.object({
    page: Joi.number().min(1).optional(),
    limit: Joi.number().min(1).max(100).optional(),
    search: Joi.string().optional(),
    status: Joi.string().valid('all', 'active', 'inactive').optional(),
    sortBy: Joi.string().valid('name', 'email', 'joinedAt', 'testsCompleted', 'averageScore').optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional(),
  }),
});

const getInvitationsSchema = Joi.object({
  query: Joi.object({
    page: Joi.number().min(1).optional(),
    limit: Joi.number().min(1).max(100).optional(),
    status: Joi.string().valid('all', 'pending', 'accepted', 'rejected', 'expired').optional(),
    sortBy: Joi.string().valid('createdAt', 'expiresAt', 'status').optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional(),
  }),
});

// ========== TUTOR ROUTES ========== //

/**
 * @swagger
 * /api/v1/tutor/students/stats:
 *   get:
 *     summary: Get student management statistics for tutor
 *     tags: [Tutor - Student Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/stats',
  authMiddleware.authenticate,
  authMiddleware.authorizeRoles('tutor'),
  studentManagementController.getStudentStats
);

/**
 * @swagger
 * /api/v1/tutor/students:
 *   get:
 *     summary: Get tutor's students with filtering and pagination
 *     tags: [Tutor - Student Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, active, inactive]
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, email, joinedAt, testsCompleted, averageScore]
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Students retrieved successfully
 */
router.get(
  '/',
  authMiddleware.authenticate,
  authMiddleware.authorizeRoles('tutor'),
  validate(getStudentsSchema),
  studentManagementController.getTutorStudents
);

/**
 * @swagger
 * /api/v1/tutor/students/invitations:
 *   get:
 *     summary: Get all invitations for tutor
 *     tags: [Tutor - Student Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Invitations retrieved successfully
 */
router.get(
  '/invitations',
  authMiddleware.authenticate,
  authMiddleware.authorizeRoles('tutor'),
  validate(getInvitationsSchema),
  studentManagementController.getTutorInvitations
);

/**
 * @swagger
 * /api/v1/tutor/students/invite:
 *   post:
 *     summary: Generate invite code for students
 *     tags: [Tutor - Student Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 maxLength: 500
 *               expiresIn:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 30
 *     responses:
 *       201:
 *         description: Invite code generated successfully
 */
router.post(
  '/invite',
  authMiddleware.authenticate,
  authMiddleware.authorizeRoles('tutor'),
  validate(generateInviteSchema),
  studentManagementController.generateInviteCode
);

/**
 * @swagger
 * /api/v1/tutor/students/invitations/{invitationId}/status:
 *   patch:
 *     summary: Approve or reject student invitation
 *     tags: [Tutor - Student Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invitationId
 *         required: true
 *         schema:
 *           type: string
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
 *                 enum: [accepted, rejected]
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Invitation status updated successfully
 */
router.patch(
  '/invitations/:invitationId/status',
  authMiddleware.authenticate,
  authMiddleware.authorizeRoles('tutor'),
  validate(updateInvitationStatusSchema),
  studentManagementController.updateInvitationStatus
);

/**
 * @swagger
 * /api/v1/tutor/students/invitations/{invitationId}/resend:
 *   post:
 *     summary: Resend invitation
 *     tags: [Tutor - Student Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invitationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invitation resent successfully
 */
router.post(
  '/invitations/:invitationId/resend',
  authMiddleware.authenticate,
  authMiddleware.authorizeRoles('tutor'),
  studentManagementController.resendInvitation
);

/**
 * @swagger
 * /api/v1/tutor/students/{studentId}:
 *   delete:
 *     summary: Remove student from tutor
 *     tags: [Tutor - Student Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student removed successfully
 */
router.delete(
  '/:studentId',
  authMiddleware.authenticate,
  authMiddleware.authorizeRoles('tutor'),
  studentManagementController.removeStudent
);

// ========== PUBLIC ROUTES (for students to join) ========== //

/**
 * @swagger
 * /api/v1/join/{inviteCode}:
 *   get:
 *     summary: Get invitation details by code (public)
 *     tags: [Student - Join Tutor]
 *     parameters:
 *       - in: path
 *         name: inviteCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invitation details retrieved successfully
 *       404:
 *         description: Invalid or expired invite code
 */
router.get(
  '/join/:inviteCode',
  studentManagementController.getInvitationByCode
);

/**
 * @swagger
 * /api/v1/join/{inviteCode}:
 *   post:
 *     summary: Join tutor using invite code (for students)
 *     tags: [Student - Join Tutor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: inviteCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully joined tutor
 *       404:
 *         description: Invalid or expired invite code
 *       400:
 *         description: Student already connected to tutor
 */
router.post(
  '/join/:inviteCode',
  authMiddleware.authenticate,
  authMiddleware.authorizeRoles('student'),
  studentManagementController.joinTutorByCode
);

export default router;
