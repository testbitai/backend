import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { Types } from 'mongoose';
import RewardModel, { UserRewardModel, RewardType, RewardCategory, RewardStatus } from '../models/reward.model';
import UserModel from '../models/user.model';
import { AppError } from '../utils/AppError';

/**
 * Get all rewards with filtering, pagination, and search
 */
export const getAllRewards = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 12,
      search = '',
      type = 'all',
      category = 'all',
      status = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      isAutoAwarded = 'all',
      isVisible = 'all',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const filter: any = {};

    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Type filter
    if (type !== 'all') {
      filter.type = type;
    }

    // Category filter
    if (category !== 'all') {
      filter.category = category;
    }

    // Status filter
    if (status !== 'all') {
      filter.status = status;
    }

    // Auto-awarded filter
    if (isAutoAwarded !== 'all') {
      filter.isAutoAwarded = isAutoAwarded === 'true';
    }

    // Visibility filter
    if (isVisible !== 'all') {
      filter.isVisible = isVisible === 'true';
    }

    // Build sort object
    const sortObj: any = {};
    sortObj[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    // Get rewards with populated creator info
    const rewards = await RewardModel.find(filter)
      .populate('createdBy', 'name email')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get award counts for each reward
    const rewardsWithStats = await Promise.all(
      rewards.map(async (reward) => {
        const awardCount = await UserRewardModel.countDocuments({ reward: reward._id });
        const recentAwards = await UserRewardModel.find({ reward: reward._id })
          .populate('user', 'name email')
          .sort({ awardedAt: -1 })
          .limit(5)
          .lean();

        return {
          ...reward,
          awardCount,
          recentAwards,
          canBeAwarded: reward.status === RewardStatus.ACTIVE && 
                       (!reward.maxAwards || awardCount < reward.maxAwards),
        };
      })
    );

    // Get total count for pagination
    const totalCount = await RewardModel.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Rewards retrieved successfully',
      data: {
        rewards: rewardsWithStats,
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
          type,
          category,
          status,
          sortBy,
          sortOrder,
          isAutoAwarded,
          isVisible,
        }
      }
    });
  } catch (error) {
    console.error('Error fetching rewards:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch rewards',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get reward statistics
 */
export const getRewardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const totalRewards = await RewardModel.countDocuments();
    const activeRewards = await RewardModel.countDocuments({ status: RewardStatus.ACTIVE });
    const draftRewards = await RewardModel.countDocuments({ status: RewardStatus.DRAFT });
    const archivedRewards = await RewardModel.countDocuments({ status: RewardStatus.ARCHIVED });

    // Get total awards given
    const totalAwardsGiven = await UserRewardModel.countDocuments();
    
    // Get unique users who received rewards
    const uniqueRewardedUsers = await UserRewardModel.distinct('user');
    
    // Get awards in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentAwards = await UserRewardModel.countDocuments({
      awardedAt: { $gte: thirtyDaysAgo }
    });

    // Get type distribution
    const typeDistribution = await RewardModel.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    // Get category distribution
    const categoryDistribution = await RewardModel.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    // Get most awarded rewards
    const mostAwardedRewards = await UserRewardModel.aggregate([
      { $group: { _id: '$reward', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'rewards',
          localField: '_id',
          foreignField: '_id',
          as: 'reward'
        }
      },
      { $unwind: '$reward' },
      {
        $project: {
          name: '$reward.name',
          type: '$reward.type',
          count: 1
        }
      }
    ]);

    // Get monthly award trends
    const monthlyTrends = await UserRewardModel.aggregate([
      {
        $match: {
          awardedAt: { $gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$awardedAt' },
            month: { $month: '$awardedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Reward statistics retrieved successfully',
      data: {
        totalRewards,
        activeRewards,
        draftRewards,
        archivedRewards,
        totalAwardsGiven,
        uniqueRewardedUsers: uniqueRewardedUsers.length,
        recentAwards,
        typeDistribution,
        categoryDistribution,
        mostAwardedRewards,
        monthlyTrends,
        averageAwardsPerReward: totalRewards > 0 ? totalAwardsGiven / totalRewards : 0,
      }
    });
  } catch (error) {
    console.error('Error fetching reward stats:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch reward statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get single reward details
 */
export const getRewardById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { rewardId } = req.params;

    if (!Types.ObjectId.isValid(rewardId)) {
      res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid reward ID'
      });
      return;
    }

    const reward = await RewardModel.findById(rewardId)
      .populate('createdBy', 'name email')
      .lean();

    if (!reward) {
      res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'Reward not found'
      });
      return;
    }

    // Get detailed award information
    const awards = await UserRewardModel.find({ reward: rewardId })
      .populate('user', 'name email avatar')
      .populate('awardedBy', 'name email')
      .sort({ awardedAt: -1 })
      .lean();

    // Get award analytics
    const analytics = {
      totalAwarded: awards.length,
      uniqueUsers: new Set(awards.map(a => a.user.toString())).size,
      averagePerUser: awards.length > 0 ? awards.length / new Set(awards.map(a => a.user.toString())).size : 0,
      recentAwards: awards.slice(0, 10),
      awardsByMonth: await UserRewardModel.aggregate([
        { $match: { reward: new Types.ObjectId(rewardId) } },
        {
          $group: {
            _id: {
              year: { $year: '$awardedAt' },
              month: { $month: '$awardedAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    };

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Reward details retrieved successfully',
      data: {
        reward,
        awards,
        analytics
      }
    });
  } catch (error) {
    console.error('Error fetching reward details:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch reward details',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Create new reward
 */
export const createReward = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rewardData = {
      ...req.body,
      createdBy: (req as any).user._id
    };

    const reward = new RewardModel(rewardData);
    await reward.save();

    const populatedReward = await RewardModel.findById(reward._id)
      .populate('createdBy', 'name email')
      .lean();

    res.status(httpStatus.CREATED).json({
      success: true,
      message: 'Reward created successfully',
      data: populatedReward
    });
  } catch (error) {
    console.error('Error creating reward:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to create reward',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Update reward
 */
export const updateReward = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { rewardId } = req.params;

    if (!Types.ObjectId.isValid(rewardId)) {
      res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid reward ID'
      });
      return;
    }

    const reward = await RewardModel.findByIdAndUpdate(
      rewardId,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!reward) {
      res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'Reward not found'
      });
      return;
    }

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Reward updated successfully',
      data: reward
    });
  } catch (error) {
    console.error('Error updating reward:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to update reward',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Delete reward
 */
export const deleteReward = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { rewardId } = req.params;

    if (!Types.ObjectId.isValid(rewardId)) {
      res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid reward ID'
      });
      return;
    }

    // Check if reward has been awarded
    const awardCount = await UserRewardModel.countDocuments({ reward: rewardId });
    
    if (awardCount > 0) {
      // Archive instead of delete if it has been awarded
      const reward = await RewardModel.findByIdAndUpdate(
        rewardId,
        { status: RewardStatus.ARCHIVED, updatedAt: new Date() },
        { new: true }
      );

      res.status(httpStatus.OK).json({
        success: true,
        message: 'Reward archived successfully (cannot delete awarded rewards)',
        data: reward
      });
      return;
    }

    const reward = await RewardModel.findByIdAndDelete(rewardId);

    if (!reward) {
      res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'Reward not found'
      });
      return;
    }

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Reward deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting reward:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to delete reward',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Award reward to users
 */
export const awardReward = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { rewardId } = req.params;
    const { userIds, reason } = req.body;

    if (!Types.ObjectId.isValid(rewardId)) {
      res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid reward ID'
      });
      return;
    }

    if (!Array.isArray(userIds) || userIds.length === 0) {
      res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'User IDs are required'
      });
      return;
    }

    const reward = await RewardModel.findById(rewardId);
    if (!reward) {
      res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'Reward not found'
      });
      return;
    }

    // Check if reward can be awarded
    const now = new Date();
    const validFrom = !reward.validFrom || reward.validFrom <= now;
    const validUntil = !reward.validUntil || reward.validUntil >= now;
    const canBeAwarded = reward.status === 'active' && validFrom && validUntil && 
                        (!reward.maxAwards || reward.totalAwarded < reward.maxAwards);

    if (!canBeAwarded) {
      res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Reward cannot be awarded at this time'
      });
      return;
    }

    // Validate users exist
    const users = await UserModel.find({ _id: { $in: userIds } });
    if (users.length !== userIds.length) {
      res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Some users not found'
      });
      return;
    }

    const awardedBy = (req as any).user._id;
    const awards = [];
    const errors = [];

    for (const userId of userIds) {
      try {
        // Check if user already has this reward
        const existingAward = await UserRewardModel.findOne({
          user: userId,
          reward: rewardId
        });

        if (existingAward) {
          errors.push({ userId, error: 'User already has this reward' });
          continue;
        }

        const userReward = new UserRewardModel({
          user: userId,
          reward: rewardId,
          awardedBy,
          reason
        });

        await userReward.save();
        awards.push(userReward);

        // Update user's coins if reward has coin value
        if (reward.coinValue > 0) {
          await UserModel.findByIdAndUpdate(userId, {
            $inc: { coins: reward.coinValue }
          });
        }
      } catch (error) {
        errors.push({ userId, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    // Update reward's total awarded count
    await RewardModel.findByIdAndUpdate(rewardId, {
      $inc: { totalAwarded: awards.length }
    });

    res.status(httpStatus.OK).json({
      success: true,
      message: `Reward awarded to ${awards.length} user(s)`,
      data: {
        awarded: awards.length,
        errors: errors.length,
        details: { awards, errors }
      }
    });
  } catch (error) {
    console.error('Error awarding reward:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to award reward',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Revoke reward from user
 */
export const revokeReward = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { rewardId, userId } = req.params;

    if (!Types.ObjectId.isValid(rewardId) || !Types.ObjectId.isValid(userId)) {
      res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid reward or user ID'
      });
      return;
    }

    const userReward = await UserRewardModel.findOneAndDelete({
      user: userId,
      reward: rewardId
    });

    if (!userReward) {
      res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'User reward not found'
      });
      return;
    }

    // Get reward details to deduct coins
    const reward = await RewardModel.findById(rewardId);
    if (reward && reward.coinValue > 0) {
      await UserModel.findByIdAndUpdate(userId, {
        $inc: { coins: -reward.coinValue }
      });
    }

    // Update reward's total awarded count
    await RewardModel.findByIdAndUpdate(rewardId, {
      $inc: { totalAwarded: -1 }
    });

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Reward revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking reward:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to revoke reward',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get user rewards
 */
export const getUserRewards = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!Types.ObjectId.isValid(userId)) {
      res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid user ID'
      });
      return;
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const userRewards = await UserRewardModel.find({ user: userId })
      .populate('reward')
      .populate('awardedBy', 'name email')
      .sort({ awardedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const totalCount = await UserRewardModel.countDocuments({ user: userId });
    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(httpStatus.OK).json({
      success: true,
      message: 'User rewards retrieved successfully',
      data: {
        rewards: userRewards,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          limit: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user rewards:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch user rewards',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Bulk update rewards
 */
export const bulkUpdateRewards = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { rewardIds, updates } = req.body;

    if (!Array.isArray(rewardIds) || rewardIds.length === 0) {
      res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Reward IDs are required'
      });
      return;
    }

    const result = await RewardModel.updateMany(
      { _id: { $in: rewardIds } },
      { ...updates, updatedAt: new Date() }
    );

    res.status(httpStatus.OK).json({
      success: true,
      message: `${result.modifiedCount} reward(s) updated successfully`,
      data: {
        matched: result.matchedCount,
        modified: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Error bulk updating rewards:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to bulk update rewards',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
