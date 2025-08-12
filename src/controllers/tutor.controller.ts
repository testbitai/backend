import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { AppError } from '../utils/AppError';
import { catchAsync } from '../utils/catchAsync';

// Import the existing User model
const User = require('../models/user.model').default;

// ========== HELPER FUNCTIONS ========== //

const buildFilterQuery = (query: any) => {
  const filter: any = { role: 'tutor' }; // Always filter for tutors only
  
  // Search filter
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } },
    ];
  }
  
  // Status filter (using isEmailVerified as status indicator)
  if (query.status && query.status !== 'all') {
    if (query.status === 'active') {
      filter.isEmailVerified = true;
    } else if (query.status === 'inactive') {
      filter.isEmailVerified = false;
    }
  }
  
  // Verification filter
  if (query.isVerified && query.isVerified !== 'all') {
    filter.isEmailVerified = query.isVerified === 'true';
  }
  
  // Experience filter (if tutorDetails.examFocus exists, use it as a proxy for experience)
  if (query.experience && query.experience !== 'all') {
    // This is a simplified implementation - you might want to add an experience field to tutorDetails
    if (query.experience === '0-2') {
      filter['tutorDetails.examFocus'] = { $size: 1 };
    } else if (query.experience === '3-5') {
      filter['tutorDetails.examFocus'] = { $size: 2 };
    } else if (query.experience === '6-10') {
      filter['tutorDetails.examFocus'] = { $exists: true };
    }
  }
  
  return filter;
};

const paginateUsers = async (filter: any, options: any) => {
  const { page = 1, limit = 12, sortBy = 'createdAt', sortOrder = 'desc' } = options;
  const skip = (page - 1) * limit;
  
  // Build sort object
  const sort: any = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
  
  // Execute queries in parallel
  const [docs, totalCount] = await Promise.all([
    User.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-password') // Exclude password field
      .lean(),
    User.countDocuments(filter),
  ]);
  
  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  return {
    tutors: docs.map(transformUserToTutor), // Transform user data to tutor format
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      limit,
      hasNextPage,
      hasPrevPage,
    },
  };
};

// Transform user data to match frontend tutor interface
const transformUserToTutor = (user: any) => {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone || null,
    profilePicture: user.avatar,
    status: user.isEmailVerified ? 'active' : 'inactive',
    role: user.role,
    
    // Mock data for fields that don't exist in user model
    specialization: user.tutorDetails?.examFocus || ['Physics', 'Mathematics'],
    experience: Math.floor(Math.random() * 10) + 1, // Mock experience
    qualification: 'M.Sc. in Physics', // Mock qualification
    bio: `Experienced ${user.tutorDetails?.examFocus?.[0] || 'Physics'} teacher`,
    
    // Ratings & Reviews (mock data)
    rating: 4.0 + Math.random() * 1, // Random rating between 4.0-5.0
    totalStudents: user.tutorDetails?.students?.length || Math.floor(Math.random() * 200),
    totalTests: Math.floor(Math.random() * 50),
    testsCreated: Math.floor(Math.random() * 30),
    averageRating: 4.0 + Math.random() * 1,
    
    // Verification
    isVerified: user.isEmailVerified,
    
    // Teaching Details
    subjects: user.tutorDetails?.examFocus || ['Physics'],
    examTypes: user.tutorDetails?.examFocus || ['JEE'],
    
    // Performance Metrics (mock data)
    performance: {
      studentsEnrolled: user.tutorDetails?.students?.length || Math.floor(Math.random() * 100),
      averageStudentScore: 70 + Math.random() * 25, // 70-95%
      completionRate: 80 + Math.random() * 15, // 80-95%
      studentSatisfaction: 85 + Math.random() * 10, // 85-95%
    },
    
    // Financial (mock data)
    earnings: {
      totalEarnings: Math.floor(Math.random() * 500000),
      monthlyEarnings: Math.floor(Math.random() * 50000),
      pendingPayments: Math.floor(Math.random() * 10000),
    },
    
    // Timestamps
    joinDate: user.createdAt,
    lastActive: user.updatedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

// ========== CONTROLLER FUNCTIONS ========== //

/**
 * Get all tutors with filtering, pagination, and sorting
 */
export const getTutors = catchAsync(async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 12,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    ...filterParams
  } = req.query;
  
  // Build filter query
  const filter = buildFilterQuery(filterParams);
  
  // Pagination options
  const options = {
    page: parseInt(page as string, 10),
    limit: parseInt(limit as string, 10),
    sortBy: sortBy as string,
    sortOrder: sortOrder as string,
  };
  
  // Get paginated results
  const result = await paginateUsers(filter, options);
  
  // Get statistics
  const stats = await getTutorStatsData();
  
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Tutors retrieved successfully',
    data: {
      ...result,
      stats,
      filters: {
        search: filterParams.search || '',
        status: filterParams.status || 'all',
        specialization: filterParams.specialization || 'all',
        experience: filterParams.experience || 'all',
        rating: filterParams.rating || 'all',
        isVerified: filterParams.isVerified || 'all',
        sortBy,
        sortOrder,
      },
    },
  });
});

/**
 * Get tutor statistics
 */
export const getTutorStats = catchAsync(async (req: Request, res: Response) => {
  const stats = await getTutorStatsData();
  
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Tutor statistics retrieved successfully',
    data: stats,
  });
});

// Helper function to get tutor statistics
const getTutorStatsData = async () => {
  const [stats] = await User.aggregate([
    { $match: { role: 'tutor' } },
    {
      $group: {
        _id: null,
        totalTutors: { $sum: 1 },
        activeTutors: {
          $sum: { $cond: [{ $eq: ['$isEmailVerified', true] }, 1, 0] }
        },
        pendingApprovals: {
          $sum: { $cond: [{ $eq: ['$isEmailVerified', false] }, 1, 0] }
        },
        suspendedTutors: { $sum: 0 }, // No suspended status in current model
      }
    }
  ]);
  
  return {
    totalTutors: stats?.totalTutors || 0,
    activeTutors: stats?.activeTutors || 0,
    pendingApprovals: stats?.pendingApprovals || 0,
    suspendedTutors: stats?.suspendedTutors || 0,
    averageRating: 4.5, // Mock average rating
    totalStudentsEnrolled: Math.floor(Math.random() * 5000), // Mock data
    totalTestsCreated: Math.floor(Math.random() * 1000), // Mock data
    monthlyGrowth: 12, // Mock growth percentage
  };
};

/**
 * Get single tutor by ID
 */
export const getTutor = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { tutorId } = req.params;
  
  const user = await User.findOne({ _id: tutorId, role: 'tutor' }).select('-password');
  
  if (!user) {
    return next(new AppError('Tutor not found', httpStatus.NOT_FOUND));
  }
  
  const tutor = transformUserToTutor(user.toObject());
  
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Tutor retrieved successfully',
    data: tutor,
  });
});

/**
 * Update tutor status (email verification)
 */
export const updateTutorStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { tutorId } = req.params;
  const { status } = req.body;
  
  // Validate status
  if (!['active', 'inactive'].includes(status)) {
    return next(new AppError('Invalid status. Use "active" or "inactive"', httpStatus.BAD_REQUEST));
  }
  
  // Check if tutor exists
  const user = await User.findOne({ _id: tutorId, role: 'tutor' });
  if (!user) {
    return next(new AppError('Tutor not found', httpStatus.NOT_FOUND));
  }
  
  // Update email verification status based on status
  user.isEmailVerified = status === 'active';
  await user.save();
  
  const tutor = transformUserToTutor(user.toObject());
  
  res.status(httpStatus.OK).json({
    success: true,
    message: `Tutor status updated to ${status}`,
    data: tutor,
  });
});

/**
 * Update tutor verification status
 */
export const verifyTutor = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { tutorId } = req.params;
  const { isVerified } = req.body;
  
  // Check if tutor exists
  const user = await User.findOne({ _id: tutorId, role: 'tutor' });
  if (!user) {
    return next(new AppError('Tutor not found', httpStatus.NOT_FOUND));
  }
  
  // Update verification status
  user.isEmailVerified = isVerified;
  await user.save();
  
  const tutor = transformUserToTutor(user.toObject());
  
  res.status(httpStatus.OK).json({
    success: true,
    message: `Tutor ${isVerified ? 'verified' : 'unverified'} successfully`,
    data: tutor,
  });
});

/**
 * Delete tutor
 */
export const deleteTutor = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { tutorId } = req.params;
  
  // Check if tutor exists
  const user = await User.findOne({ _id: tutorId, role: 'tutor' });
  if (!user) {
    return next(new AppError('Tutor not found', httpStatus.NOT_FOUND));
  }
  
  // Delete tutor
  await User.findByIdAndDelete(tutorId);
  
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Tutor deleted successfully',
    data: null,
  });
});

/**
 * Send notification to tutors
 */
export const sendNotification = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { tutorIds, subject, message } = req.body;
  
  // Validate input
  if (!tutorIds || !Array.isArray(tutorIds) || tutorIds.length === 0) {
    return next(new AppError('Tutor IDs are required', httpStatus.BAD_REQUEST));
  }
  
  if (!subject || !message) {
    return next(new AppError('Subject and message are required', httpStatus.BAD_REQUEST));
  }
  
  // Check if tutors exist
  const tutors = await User.find({ 
    _id: { $in: tutorIds }, 
    role: 'tutor' 
  }).select('name email');
  
  if (tutors.length !== tutorIds.length) {
    return next(new AppError('Some tutors not found', httpStatus.NOT_FOUND));
  }
  
  // TODO: Implement actual notification sending logic
  console.log(`Sending notification to ${tutors.length} tutors:`);
  console.log(`Subject: ${subject}`);
  console.log(`Message: ${message}`);
  console.log(`Recipients: ${tutors.map((t: any) => t.email).join(', ')}`);
  
  res.status(httpStatus.OK).json({
    success: true,
    message: `Notification sent to ${tutors.length} tutor(s) successfully`,
    data: {
      recipientCount: tutors.length,
      recipients: tutors.map((tutor: any) => ({
        id: tutor._id,
        name: tutor.name,
        email: tutor.email,
      })),
    },
  });
});

/**
 * Bulk update tutors
 */
export const bulkUpdateTutors = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { tutorIds, updateData } = req.body;
  
  // Validate input
  if (!tutorIds || !Array.isArray(tutorIds) || tutorIds.length === 0) {
    return next(new AppError('Tutor IDs are required', httpStatus.BAD_REQUEST));
  }
  
  if (!updateData || Object.keys(updateData).length === 0) {
    return next(new AppError('Update data is required', httpStatus.BAD_REQUEST));
  }
  
  // Transform update data to match user model fields
  const userUpdateData: any = {};
  
  if (updateData.status) {
    userUpdateData.isEmailVerified = updateData.status === 'active';
  }
  
  if (updateData.isVerified !== undefined) {
    userUpdateData.isEmailVerified = updateData.isVerified;
  }
  
  // Perform bulk update
  const result = await User.updateMany(
    { _id: { $in: tutorIds }, role: 'tutor' },
    userUpdateData
  );
  
  res.status(httpStatus.OK).json({
    success: true,
    message: `${result.modifiedCount} tutor(s) updated successfully`,
    data: {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    },
  });
});
