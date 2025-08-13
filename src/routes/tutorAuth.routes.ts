import express from 'express';
import tutorController from '../controllers/tutor.controller';
import tutorValidation from '../validations/tutor.validation';
import authMiddleware from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';

const router = express.Router();

// ========== PUBLIC ROUTES (Registration Flow) ========== //

/**
 * @swagger
 * /api/v1/tutor/send-otp:
 *   post:
 *     summary: Send OTP for tutor email verification
 *     tags: [Tutor Registration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Tutor's email address
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Email already registered or validation error
 */
router.post(
  '/send-otp',
  validate(tutorValidation.sendTutorOTP),
  tutorController.sendOTP
);

/**
 * @swagger
 * /api/v1/tutor/verify-email:
 *   post:
 *     summary: Verify tutor email with OTP
 *     tags: [Tutor Registration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp:
 *                 type: string
 *                 pattern: '^[0-9]{6}$'
 *                 description: 6-digit OTP
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired OTP
 */
router.post(
  '/verify-email',
  validate(tutorValidation.verifyTutorEmail),
  tutorController.verifyEmail
);

/**
 * @swagger
 * /api/v1/tutor/register:
 *   post:
 *     summary: Complete tutor registration
 *     tags: [Tutor Registration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - instituteName
 *               - examFocus
 *               - subjects
 *               - bio
 *               - experience
 *               - qualifications
 *               - phone
 *               - address
 *               - planType
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               instituteName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               examFocus:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [JEE, BITSAT]
 *                 minItems: 1
 *               subjects:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [Physics, Chemistry, Mathematics]
 *                 minItems: 1
 *               bio:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *               experience:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 50
 *               qualifications:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 200
 *               phone:
 *                 type: string
 *                 pattern: '^[6-9][0-9]{9}$'
 *               address:
 *                 type: object
 *                 required:
 *                   - street
 *                   - city
 *                   - state
 *                   - pincode
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   pincode:
 *                     type: string
 *                     pattern: '^[0-9]{6}$'
 *               planType:
 *                 type: string
 *                 enum: [starter, pro]
 *               paymentMethod:
 *                 type: string
 *                 enum: [razorpay, stripe]
 *                 default: razorpay
 *     responses:
 *       201:
 *         description: Tutor registered successfully
 *       400:
 *         description: Validation error or email already taken
 */
router.post(
  '/register',
  validate(tutorValidation.tutorRegister),
  tutorController.register
);

// ========== PROTECTED ROUTES (Require Authentication) ========== //

/**
 * @swagger
 * /api/v1/tutor/profile:
 *   get:
 *     summary: Get tutor profile
 *     tags: [Tutor Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/profile',
  authMiddleware.authenticate,
  authMiddleware.authorizeRoles('tutor'),
  tutorController.getProfile
);

/**
 * @swagger
 * /api/v1/tutor/profile:
 *   put:
 *     summary: Update tutor profile
 *     tags: [Tutor Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               instituteName:
 *                 type: string
 *               examFocus:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [JEE, BITSAT]
 *               subjects:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [Physics, Chemistry, Mathematics]
 *               bio:
 *                 type: string
 *               experience:
 *                 type: integer
 *               qualifications:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   pincode:
 *                     type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 */
router.put(
  '/profile',
  authMiddleware.authenticate,
  authMiddleware.authorizeRoles('tutor'),
  validate(tutorValidation.updateTutorProfile),
  tutorController.updateProfile
);

/**
 * @swagger
 * /api/v1/tutor/dashboard:
 *   get:
 *     summary: Get tutor dashboard data
 *     tags: [Tutor Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/dashboard',
  authMiddleware.authenticate,
  authMiddleware.authorizeRoles('tutor'),
  tutorController.getDashboard
);

/**
 * @swagger
 * /api/v1/tutor/invite-code:
 *   post:
 *     summary: Generate invite code for students
 *     tags: [Tutor Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               expiresInDays:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 365
 *                 default: 30
 *               maxUses:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 1000
 *                 default: 50
 *     responses:
 *       201:
 *         description: Invite code generated successfully
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/invite-code',
  authMiddleware.authenticate,
  authMiddleware.authorizeRoles('tutor'),
  validate(tutorValidation.generateInviteCode),
  tutorController.generateInviteCode
);

export default router;
