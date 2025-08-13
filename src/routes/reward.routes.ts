import { Router } from 'express';
import {
  getAllRewards,
  getRewardStats,
  getRewardById,
  createReward,
  updateReward,
  deleteReward,
  awardReward,
  revokeReward,
  getUserRewards,
  bulkUpdateRewards,
} from '../controllers/reward.controller';
import authMiddleware from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';
import {
  getAllRewardsValidation,
  getRewardByIdValidation,
  createRewardValidation,
  updateRewardValidation,
  deleteRewardValidation,
  awardRewardValidation,
  revokeRewardValidation,
  getUserRewardsValidation,
  bulkUpdateRewardsValidation,
} from '../validations/reward.validation';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware.authenticate);

/**
 * @swagger
 * components:
 *   schemas:
 *     Reward:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - type
 *         - category
 *         - icon
 *         - coinValue
 *       properties:
 *         _id:
 *           type: string
 *           description: Reward ID
 *         name:
 *           type: string
 *           maxLength: 100
 *           description: Reward name
 *         description:
 *           type: string
 *           maxLength: 500
 *           description: Reward description
 *         type:
 *           type: string
 *           enum: [badge, coin, achievement, streak, level]
 *           description: Reward type
 *         category:
 *           type: string
 *           enum: [performance, engagement, milestone, special, seasonal]
 *           description: Reward category
 *         status:
 *           type: string
 *           enum: [active, inactive, draft, archived]
 *           description: Reward status
 *         icon:
 *           type: string
 *           description: Reward icon
 *         image:
 *           type: string
 *           description: Reward image URL
 *         color:
 *           type: string
 *           pattern: ^#[0-9A-Fa-f]{6}$
 *           description: Reward color
 *         coinValue:
 *           type: number
 *           minimum: 0
 *           description: Coin value of reward
 *         criteria:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [score, tests_completed, streak, login_days, custom]
 *               operator:
 *                 type: string
 *                 enum: [gte, lte, eq, between]
 *               value:
 *                 oneOf:
 *                   - type: number
 *                   - type: array
 *                     items:
 *                       type: number
 *               description:
 *                 type: string
 *         isAutoAwarded:
 *           type: boolean
 *           description: Whether reward is automatically awarded
 *         maxAwards:
 *           type: number
 *           minimum: 1
 *           description: Maximum number of awards
 *         validFrom:
 *           type: string
 *           format: date-time
 *           description: Valid from date
 *         validUntil:
 *           type: string
 *           format: date-time
 *           description: Valid until date
 *         totalAwarded:
 *           type: number
 *           description: Total times awarded
 *         isVisible:
 *           type: boolean
 *           description: Whether reward is visible
 *         sortOrder:
 *           type: number
 *           description: Sort order
 *         metadata:
 *           type: object
 *           properties:
 *             difficulty:
 *               type: string
 *               enum: [easy, medium, hard, legendary]
 *             rarity:
 *               type: string
 *               enum: [common, rare, epic, legendary]
 *             tags:
 *               type: array
 *               items:
 *                 type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/admin/rewards:
 *   get:
 *     summary: Get all rewards with filtering and pagination
 *     tags: [Admin - Rewards]
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
 *         description: Number of rewards per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name and description
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [badge, coin, achievement, streak, level, all]
 *           default: all
 *         description: Filter by reward type
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [performance, engagement, milestone, special, seasonal, all]
 *           default: all
 *         description: Filter by category
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, draft, archived, all]
 *           default: all
 *         description: Filter by status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt, updatedAt, totalAwarded, coinValue, sortOrder]
 *           default: createdAt
 *         description: Sort by field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Rewards retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', validate(getAllRewardsValidation), getAllRewards);

/**
 * @swagger
 * /api/v1/admin/rewards/stats:
 *   get:
 *     summary: Get reward statistics
 *     tags: [Admin - Rewards]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', getRewardStats);

/**
 * @swagger
 * /api/v1/admin/rewards/{rewardId}:
 *   get:
 *     summary: Get reward by ID
 *     tags: [Admin - Rewards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rewardId
 *         required: true
 *         schema:
 *           type: string
 *         description: Reward ID
 *     responses:
 *       200:
 *         description: Reward retrieved successfully
 *       404:
 *         description: Reward not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:rewardId', validate(getRewardByIdValidation), getRewardById);

/**
 * @swagger
 * /api/v1/admin/rewards:
 *   post:
 *     summary: Create new reward
 *     tags: [Admin - Rewards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Reward'
 *     responses:
 *       201:
 *         description: Reward created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', validate(createRewardValidation), createReward);

/**
 * @swagger
 * /api/v1/admin/rewards/{rewardId}:
 *   patch:
 *     summary: Update reward
 *     tags: [Admin - Rewards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rewardId
 *         required: true
 *         schema:
 *           type: string
 *         description: Reward ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Reward'
 *     responses:
 *       200:
 *         description: Reward updated successfully
 *       404:
 *         description: Reward not found
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.patch('/:rewardId', validate(updateRewardValidation), updateReward);

/**
 * @swagger
 * /api/v1/admin/rewards/{rewardId}:
 *   delete:
 *     summary: Delete reward
 *     tags: [Admin - Rewards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rewardId
 *         required: true
 *         schema:
 *           type: string
 *         description: Reward ID
 *     responses:
 *       200:
 *         description: Reward deleted successfully
 *       404:
 *         description: Reward not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:rewardId', validate(deleteRewardValidation), deleteReward);

/**
 * @swagger
 * /api/v1/admin/rewards/{rewardId}/award:
 *   post:
 *     summary: Award reward to users
 *     tags: [Admin - Rewards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rewardId
 *         required: true
 *         schema:
 *           type: string
 *         description: Reward ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of user IDs
 *               reason:
 *                 type: string
 *                 maxLength: 200
 *                 description: Reason for awarding
 *     responses:
 *       200:
 *         description: Reward awarded successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Reward not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:rewardId/award', validate(awardRewardValidation), awardReward);

/**
 * @swagger
 * /api/v1/admin/rewards/{rewardId}/revoke/{userId}:
 *   delete:
 *     summary: Revoke reward from user
 *     tags: [Admin - Rewards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rewardId
 *         required: true
 *         schema:
 *           type: string
 *         description: Reward ID
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Reward revoked successfully
 *       404:
 *         description: User reward not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:rewardId/revoke/:userId', validate(revokeRewardValidation), revokeReward);

/**
 * @swagger
 * /api/v1/admin/rewards/users/{userId}:
 *   get:
 *     summary: Get user rewards
 *     tags: [Admin - Rewards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
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
 *           default: 20
 *         description: Number of rewards per page
 *     responses:
 *       200:
 *         description: User rewards retrieved successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */
router.get('/users/:userId', validate(getUserRewardsValidation), getUserRewards);

/**
 * @swagger
 * /api/v1/admin/rewards/bulk:
 *   patch:
 *     summary: Bulk update rewards
 *     tags: [Admin - Rewards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rewardIds
 *               - updates
 *             properties:
 *               rewardIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of reward IDs
 *               updates:
 *                 type: object
 *                 properties:
 *                   status:
 *                     type: string
 *                     enum: [active, inactive, draft, archived]
 *                   isVisible:
 *                     type: boolean
 *                   isAutoAwarded:
 *                     type: boolean
 *                   sortOrder:
 *                     type: number
 *                   category:
 *                     type: string
 *                     enum: [performance, engagement, milestone, special, seasonal]
 *     responses:
 *       200:
 *         description: Rewards updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.patch('/bulk', validate(bulkUpdateRewardsValidation), bulkUpdateRewards);

export default router;
