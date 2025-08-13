import Joi from 'joi';
import { RewardType, RewardCategory, RewardStatus } from '../models/reward.model';

const rewardCriteriaSchema = Joi.object({
  type: Joi.string().valid('score', 'tests_completed', 'streak', 'login_days', 'custom').required(),
  operator: Joi.string().valid('gte', 'lte', 'eq', 'between').required(),
  value: Joi.alternatives().try(
    Joi.number().min(0),
    Joi.array().items(Joi.number().min(0)).length(2)
  ).required(),
  description: Joi.string().max(200).required()
});

export const getAllRewardsValidation = Joi.object({
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(12),
    search: Joi.string().allow('').max(100),
    type: Joi.string().valid(...Object.values(RewardType), 'all').default('all'),
    category: Joi.string().valid(...Object.values(RewardCategory), 'all').default('all'),
    status: Joi.string().valid(...Object.values(RewardStatus), 'all').default('all'),
    sortBy: Joi.string().valid('name', 'createdAt', 'updatedAt', 'totalAwarded', 'coinValue', 'sortOrder').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    isAutoAwarded: Joi.string().valid('true', 'false', 'all').default('all'),
    isVisible: Joi.string().valid('true', 'false', 'all').default('all')
  }).unknown(false)
});

export const getRewardByIdValidation = Joi.object({
  params: Joi.object({
    rewardId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
  }).unknown(false)
});

export const createRewardValidation = Joi.object({
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
    description: Joi.string().trim().min(1).max(500).required(),
    type: Joi.string().valid(...Object.values(RewardType)).required(),
    category: Joi.string().valid(...Object.values(RewardCategory)).required(),
    status: Joi.string().valid(...Object.values(RewardStatus)).default(RewardStatus.DRAFT),
    icon: Joi.string().required(),
    image: Joi.string().uri().allow(''),
    color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#3b82f6'),
    coinValue: Joi.number().integer().min(0).default(0),
    criteria: Joi.array().items(rewardCriteriaSchema).min(0).default([]),
    isAutoAwarded: Joi.boolean().default(false),
    maxAwards: Joi.number().integer().min(1).allow(null),
    validFrom: Joi.date().allow(null),
    validUntil: Joi.date().greater(Joi.ref('validFrom')).allow(null),
    isVisible: Joi.boolean().default(true),
    sortOrder: Joi.number().integer().default(0),
    metadata: Joi.object({
      difficulty: Joi.string().valid('easy', 'medium', 'hard', 'legendary'),
      rarity: Joi.string().valid('common', 'rare', 'epic', 'legendary'),
      tags: Joi.array().items(Joi.string().trim().max(50)).max(10)
    }).allow(null)
  }).unknown(false)
});

export const updateRewardValidation = Joi.object({
  params: Joi.object({
    rewardId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
  }).unknown(false),
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100),
    description: Joi.string().trim().min(1).max(500),
    type: Joi.string().valid(...Object.values(RewardType)),
    category: Joi.string().valid(...Object.values(RewardCategory)),
    status: Joi.string().valid(...Object.values(RewardStatus)),
    icon: Joi.string(),
    image: Joi.string().uri().allow(''),
    color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
    coinValue: Joi.number().integer().min(0),
    criteria: Joi.array().items(rewardCriteriaSchema).min(0),
    isAutoAwarded: Joi.boolean(),
    maxAwards: Joi.number().integer().min(1).allow(null),
    validFrom: Joi.date().allow(null),
    validUntil: Joi.date().allow(null),
    isVisible: Joi.boolean(),
    sortOrder: Joi.number().integer(),
    metadata: Joi.object({
      difficulty: Joi.string().valid('easy', 'medium', 'hard', 'legendary'),
      rarity: Joi.string().valid('common', 'rare', 'epic', 'legendary'),
      tags: Joi.array().items(Joi.string().trim().max(50)).max(10)
    }).allow(null)
  }).min(1).unknown(false)
});

export const deleteRewardValidation = Joi.object({
  params: Joi.object({
    rewardId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
  }).unknown(false)
});

export const awardRewardValidation = Joi.object({
  params: Joi.object({
    rewardId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
  }).unknown(false),
  body: Joi.object({
    userIds: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)).min(1).max(100).required(),
    reason: Joi.string().trim().max(200).allow('')
  }).unknown(false)
});

export const revokeRewardValidation = Joi.object({
  params: Joi.object({
    rewardId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    userId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
  }).unknown(false)
});

export const getUserRewardsValidation = Joi.object({
  params: Joi.object({
    userId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
  }).unknown(false),
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }).unknown(false)
});

export const bulkUpdateRewardsValidation = Joi.object({
  body: Joi.object({
    rewardIds: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)).min(1).max(100).required(),
    updates: Joi.object({
      status: Joi.string().valid(...Object.values(RewardStatus)),
      isVisible: Joi.boolean(),
      isAutoAwarded: Joi.boolean(),
      sortOrder: Joi.number().integer(),
      category: Joi.string().valid(...Object.values(RewardCategory)),
      validFrom: Joi.date().allow(null),
      validUntil: Joi.date().allow(null)
    }).min(1).unknown(false).required()
  }).unknown(false)
});
