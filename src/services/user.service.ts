import User, { UserDocument } from '../models/user.model';
import httpStatus from 'http-status';
import { ApiError } from '../utils/apiError';

class UserService {
  /**
   * Create a user
   */
  async createUser(userData: any): Promise<UserDocument> {
    if (await User.isEmailTaken(userData.email)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
    }
    return User.create(userData);
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<UserDocument> {
    const user = await User.findById(id);
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }
    return user;
  }

  /**
   * Update user by ID
   */
  async updateUserById(userId: string, updateBody: any): Promise<UserDocument> {
    const user = await this.getUserById(userId);
    
    if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
    }

    Object.assign(user, updateBody);
    await user.save();
    return user;
  }

  /**
   * Delete user by ID
   */
  async deleteUserById(userId: string): Promise<void> {
    const user = await this.getUserById(userId);
    // await user.remove();
  }

  /**
   * Query users with pagination
   */
  async queryUsers(filter: any, options: any = {}): Promise<any> {
    const limit = options.limit ? parseInt(options.limit, 10) : 10;
    const page = options.page ? parseInt(options.page, 10) : 1;
    const skip = (page - 1) * limit;

    const users = await User.find(filter)
      .sort(options.sortBy || '-createdAt')
      .skip(skip)
      .limit(limit);

    const totalResults = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalResults / limit);

    return { results: users, totalResults, totalPages, page, limit };
  }

  /**
   * Update user avatar
   */
  async updateUserAvatar(userId: string, avatarPath: string): Promise<UserDocument> {
    return this.updateUserById(userId, { avatar: avatarPath });
  }

  /**
   * Get user badges
   */
  async getUserBadges(userId: string): Promise<any> {
    const user = await User.findById(userId).populate('badges.badge');
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }
    return user.badges;
  }

  /**
   * Update study buddy preferences
   */
  async updateStudyBuddy(userId: string, studyBuddyData: any): Promise<UserDocument> {
    return this.updateUserById(userId, { studyBuddy: studyBuddyData });
  }
}

export default new UserService();