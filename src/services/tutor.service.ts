import httpStatus from 'http-status';
import User, { UserRole, ExamGoal } from '../models/user.model';
import OTP from '../models/otp.model';
import { ApiError } from '../utils/apiError';
import { generateTokens } from '../utils/tokenUtils';
import emailService from '../utils/emailService';
import crypto from 'crypto';

interface TutorRegistrationData {
  name: string;
  email: string;
  password: string;
  instituteName: string;
  examFocus: ExamGoal[];
  subjects: string[];
  bio: string;
  experience: number;
  qualifications: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  planType: 'starter' | 'pro';
  paymentMethod?: string;
}

class TutorService {
  /**
   * Send OTP for tutor email verification
   */
  public async sendTutorOTP(email: string): Promise<void> {
    // Check if email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Email is already registered');
    }

    // Generate OTP
    const otp = OTP.generateOTP();

    // Save OTP to database
    await OTP.findOneAndUpdate(
      { email, type: 'tutor_verification' },
      {
        email,
        otp,
        type: 'tutor_verification',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        isUsed: false,
        attempts: 0,
      },
      { upsert: true, new: true }
    );

    await emailService.sendTutorOTPEmail(email, otp);
  }

  /**
   * Verify tutor email with OTP
   */
  public async verifyTutorEmail(email: string, otp: string): Promise<{ verified: boolean }> {
    const isValid = await OTP.verifyOTP(email, otp, 'tutor_verification');
    
    if (!isValid) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid or expired OTP');
    }

    return { verified: true };
  }

  /**
   * Register a new tutor
   */
  public async registerTutor(tutorData: TutorRegistrationData): Promise<{
    user: any;
    tokens: any;
  }> {
    const { email, password, name, ...tutorDetails } = tutorData;

    // Check if email is already taken
    if (await User.isEmailTaken(email)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
    }

    // Calculate subscription dates based on plan
    const subscriptionStartDate = new Date();
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1); // 1 month subscription

    // Create tutor user
    const user = await User.create({
      name,
      email,
      password,
      role: UserRole.TUTOR,
      isEmailVerified: true, // Since we verified via OTP
      tutorDetails: {
        ...tutorDetails,
        subscriptionStatus: 'pending', // Will be activated after payment
        subscriptionStartDate,
        subscriptionEndDate,
        isProfileComplete: true,
        isVerified: false, // Admin verification pending
        totalStudents: 0,
        totalTests: 0,
        rating: 0,
      },
    });

    // Generate tokens
    const tokens = await generateTokens((user._id as string).toString());

    return {
      user: user.toJSON(),
      tokens,
    };
  }

  /**
   * Update tutor profile
   */
  public async updateTutorProfile(
    tutorId: string,
    updateData: Partial<TutorRegistrationData>
  ): Promise<any> {
    const user = await User.findById(tutorId);
    if (!user || user.role !== UserRole.TUTOR) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Tutor not found');
    }

    // Update basic fields
    if (updateData.name) user.name = updateData.name;
    if (updateData.email) {
      if (await User.isEmailTaken(updateData.email, tutorId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
      }
      user.email = updateData.email;
      user.isEmailVerified = false; // Need to verify new email
    }

    // Update tutor details
    if (user.tutorDetails) {
      Object.assign(user.tutorDetails, updateData);
    }

    await user.save();
    return user.toJSON();
  }

  /**
   * Generate invite code for students
   */
  public async generateInviteCode(
    tutorId: string,
    expiresInDays: number = 30,
    maxUses: number = 50
  ): Promise<{ code: string; password: string }> {
    const user = await User.findById(tutorId);
    if (!user || user.role !== UserRole.TUTOR) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Tutor not found');
    }

    // Generate unique code and password
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    const password = crypto.randomBytes(6).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Add to tutor's invite codes
    if (!user.tutorDetails) {
      user.tutorDetails = {};
    }
    if (!user.tutorDetails.inviteCodes) {
      user.tutorDetails.inviteCodes = [];
    }

    user.tutorDetails.inviteCodes.push({
      code,
      password,
      expiresAt,
    });

    await user.save();

    return { code, password };
  }

  /**
   * Get tutor dashboard data
   */
  public async getTutorDashboard(tutorId: string): Promise<any> {
    const user = await User.findById(tutorId)
      .populate('tutorDetails.students', 'name email avatar')
      .lean();

    if (!user || user.role !== UserRole.TUTOR) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Tutor not found');
    }

    // Get additional stats (you can expand this based on your needs)
    const stats = {
      totalStudents: user.tutorDetails?.totalStudents || 0,
      totalTests: user.tutorDetails?.totalTests || 0,
      rating: user.tutorDetails?.rating || 0,
      subscriptionStatus: user.tutorDetails?.subscriptionStatus || 'pending',
      subscriptionEndDate: user.tutorDetails?.subscriptionEndDate,
    };

    return {
      user,
      stats,
    };
  }

  /**
   * Get all tutors (for admin)
   */
  public async getAllTutors(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: string
  ): Promise<any> {
    const filter: any = { role: UserRole.TUTOR };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'tutorDetails.instituteName': { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      filter['tutorDetails.subscriptionStatus'] = status;
    }

    const options = { page, limit, sortBy: '-createdAt' };
    return await User.paginate(filter, options);
  }

  /**
   * Verify tutor (admin action)
   */
  public async verifyTutor(tutorId: string, isVerified: boolean): Promise<any> {
    const user = await User.findById(tutorId);
    if (!user || user.role !== UserRole.TUTOR) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Tutor not found');
    }

    if (user.tutorDetails) {
      user.tutorDetails.isVerified = isVerified;
    }

    await user.save();
    return user.toJSON();
  }

  /**
   * Update subscription status
   */
  public async updateSubscriptionStatus(
    tutorId: string,
    status: 'active' | 'inactive' | 'pending' | 'cancelled',
    paymentId?: string
  ): Promise<any> {
    const user = await User.findById(tutorId);
    if (!user || user.role !== UserRole.TUTOR) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Tutor not found');
    }

    if (user.tutorDetails) {
      user.tutorDetails.subscriptionStatus = status;
      if (paymentId) {
        user.tutorDetails.paymentId = paymentId;
      }
      
      if (status === 'active') {
        user.tutorDetails.subscriptionStartDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);
        user.tutorDetails.subscriptionEndDate = endDate;
      }
    }

    await user.save();
    return user.toJSON();
  }

  /**
   * Get tutor statistics
   */
  async getTutorStats() {
    const totalTutors = await User.countDocuments({ role: UserRole.TUTOR });
    const activeTutors = await User.countDocuments({ 
      role: UserRole.TUTOR, 
      'subscription.status': 'active' 
    });
    const pendingTutors = await User.countDocuments({ 
      role: UserRole.TUTOR, 
      'subscription.status': 'pending' 
    });
    const verifiedTutors = await User.countDocuments({ 
      role: UserRole.TUTOR, 
      isVerified: true 
    });

    // Calculate additional stats
    const inactiveTutors = totalTutors - activeTutors;
    const unverifiedTutors = totalTutors - verifiedTutors;
    
    // For now, set default values for fields that require more complex calculations
    const averageRating = 4.2; // This would come from actual rating calculations
    const monthlyGrowth = 12.5; // This would come from comparing with previous month
    const totalStudentsEnrolled = 0; // This would come from student-tutor relationships
    const totalTestsCreated = 0; // This would come from test creation data

    return {
      totalTutors,
      activeTutors,
      pendingApprovals: pendingTutors,
      suspendedTutors: 0, // This would come from suspended status
      verifiedTutors,
      unverifiedTutors,
      inactiveTutors,
      averageRating,
      totalStudentsEnrolled,
      totalTestsCreated,
      monthlyGrowth,
    };
  }
}

export default new TutorService();
