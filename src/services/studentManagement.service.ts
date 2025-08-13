import httpStatus from 'http-status';
import User, { UserDocument } from '../models/user.model';
import StudentInvitation, { InvitationStatus, StudentInvitationDocument } from '../models/studentInvitation.model';
import TestAttemptModel from '../models/testAttempt.model';
import { ApiError } from '../utils/apiError';
import emailService from '../utils/emailService';
import mongoose from 'mongoose';

interface GenerateInviteData {
  message?: string;
  expiresIn?: number; // days
}

interface StudentStats {
  totalStudents: number;
  activeStudents: number;
  pendingInvitations: number;
  totalTestAttempts: number;
  averageScore: number;
}

interface StudentDetails {
  _id: string;
  name: string;
  email: string;
  avatar: string;
  isActive: boolean;
  joinedAt: Date;
  testsCompleted: number;
  averageScore: number;
  bestScore: number;
  currentStreak: number;
  coins: number;
  lastTestDate?: Date;
  performance: {
    Physics?: number;
    Chemistry?: number;
    Mathematics?: number;
  };
}

class StudentManagementService {
  /**
   * Generate invite code for students
   */
  public async generateInviteCode(
    tutorId: string,
    data: GenerateInviteData = {}
  ): Promise<StudentInvitationDocument> {
    // Check if tutor exists and is verified
    const tutor = await User.findById(tutorId);
    if (!tutor || tutor.role !== 'tutor') {
      throw new ApiError(httpStatus.NOT_FOUND, 'Tutor not found');
    }

    // if (!tutor.tutorDetails?.isVerified) {
    //   throw new ApiError(httpStatus.FORBIDDEN, 'Tutor account not verified');
    // }

    // Generate unique invite code
    let inviteCode: string;
    let isUnique = false;
    let attempts = 0;

    do {
      inviteCode = StudentInvitation.generateInviteCode();
      const existing = await StudentInvitation.findOne({ inviteCode });
      isUnique = !existing;
      attempts++;
    } while (!isUnique && attempts < 10);

    if (!isUnique) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to generate unique invite code');
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (data.expiresIn || 7));

    // Create invitation
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const invitation = await StudentInvitation.create({
      tutorId,
      inviteCode,
      inviteLink: `${frontendUrl}/join/${inviteCode}`,
      message: data.message,
      expiresAt,
    });

    return invitation;
  }

  /**
   * Get all invitations for a tutor
   */
  public async getTutorInvitations(
    tutorId: string,
    query: any = {}
  ): Promise<{
    invitations: StudentInvitationDocument[];
    pagination: any;
  }> {
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: any = { tutorId };
    if (status && status !== 'all') {
      filter.status = status;
    }

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const sortConfig: any = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [invitations, totalCount] = await Promise.all([
      StudentInvitation.find(filter)
        .populate('studentId', 'name email avatar')
        .sort(sortConfig)
        .skip(skip)
        .limit(limitNumber),
      StudentInvitation.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limitNumber);

    return {
      invitations,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalCount,
        limit: limitNumber,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
      },
    };
  }

  /**
   * Join tutor using invite code
   */
  public async joinTutorByCode(
    studentId: string,
    inviteCode: string
  ): Promise<StudentInvitationDocument> {
    // Find valid invitation
    const invitation = await StudentInvitation.findOne({
      inviteCode,
      status: InvitationStatus.PENDING,
      expiresAt: { $gt: new Date() },
    }).populate('tutorId', 'name email tutorDetails');

    if (!invitation) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Invalid or expired invite code');
    }

    // Check if student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      throw new ApiError(httpStatus.NOT_FOUND, 'Student not found');
    }

    // Check if student is already connected to this tutor
    const tutor = await User.findById(invitation.tutorId);
    if (tutor?.tutorDetails?.students?.includes(new mongoose.Types.ObjectId(studentId))) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Student already connected to this tutor');
    }

    // Update invitation with student details
    invitation.studentId = new mongoose.Types.ObjectId(studentId);
    invitation.studentEmail = student.email;
    invitation.studentName = student.name;
    invitation.status = InvitationStatus.ACCEPTED;
    invitation.acceptedAt = new Date();
    await invitation.save();

    // Add student to tutor's student list
    await User.findByIdAndUpdate(invitation.tutorId, {
      $addToSet: { 'tutorDetails.students': studentId },
      $inc: { 'tutorDetails.totalStudents': 1 },
    });

    return invitation;
  }

  /**
   * Get invitation by code (for join page)
   */
  public async getInvitationByCode(inviteCode: string): Promise<StudentInvitationDocument | null> {
    const invitation = await StudentInvitation.findOne({
      inviteCode,
      status: InvitationStatus.PENDING,
      expiresAt: { $gt: new Date() },
    }).populate('tutorId', 'name email tutorDetails.instituteName');

    return invitation;
  }

  /**
   * Approve or reject student invitation
   */
  public async updateInvitationStatus(
    tutorId: string,
    invitationId: string,
    status: 'accepted' | 'rejected',
    reason?: string
  ): Promise<StudentInvitationDocument> {
    const invitation = await StudentInvitation.findOne({
      _id: invitationId,
      tutorId,
    }).populate('studentId', 'name email');

    if (!invitation) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invitation already processed');
    }

    invitation.status = status === 'accepted' ? InvitationStatus.ACCEPTED : InvitationStatus.REJECTED;
    
    if (status === 'accepted') {
      invitation.acceptedAt = new Date();
      
      // Add student to tutor's student list if not already added
      const tutor = await User.findById(tutorId);
      if (tutor && invitation.studentId && 
          !tutor.tutorDetails?.students?.includes(invitation.studentId)) {
        await User.findByIdAndUpdate(tutorId, {
          $addToSet: { 'tutorDetails.students': invitation.studentId },
          $inc: { 'tutorDetails.totalStudents': 1 },
        });
      }
    } else {
      invitation.rejectedAt = new Date();
      invitation.message = reason;
    }

    await invitation.save();

    // Send notification email to student
    if (invitation.studentId) {
      const student = invitation.studentId as any;
      const tutor = await User.findById(tutorId);
      
      try {
        if (status === 'accepted') {
          await emailService.sendEmail(
            student.email,
            'Welcome! Your tutor request has been approved',
            `
            <h2>Great news!</h2>
            <p>Your request to join ${tutor?.name}'s class has been approved.</p>
            <p>You can now access all tests and materials shared by your tutor.</p>
            <p><a href="${process.env.FRONTEND_URL}/dashboard">Go to Dashboard</a></p>
            `
          );
        } else {
          await emailService.sendEmail(
            student.email,
            'Tutor Request Update',
            `
            <h2>Request Update</h2>
            <p>Your request to join ${tutor?.name}'s class has been declined.</p>
            ${reason ? `<p>Reason: ${reason}</p>` : ''}
            <p>You can try contacting your tutor directly for more information.</p>
            `
          );
        }
      } catch (error) {
        console.error('Failed to send notification email:', error);
      }
    }

    return invitation;
  }

  /**
   * Get tutor's students with detailed information
   */
  public async getTutorStudents(
    tutorId: string,
    query: any = {}
  ): Promise<{
    students: StudentDetails[];
    pagination: any;
  }> {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = 'all',
      sortBy = 'joinedAt',
      sortOrder = 'desc',
    } = query;

    // Get tutor's student IDs
    const tutor = await User.findById(tutorId);
    if (!tutor || !tutor.tutorDetails?.students) {
      return {
        students: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalCount: 0,
          limit: parseInt(limit),
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }

    const studentIds = tutor.tutorDetails.students;

    // Build filter
    const filter: any = { _id: { $in: studentIds } };
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (status !== 'all') {
      filter.isActive = status === 'active';
    }

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const sortConfig: any = {};
    if (sortBy === 'joinedAt') {
      sortConfig.createdAt = sortOrder === 'desc' ? -1 : 1;
    } else {
      sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    const [students, totalCount] = await Promise.all([
      User.find(filter)
        .sort(sortConfig)
        .skip(skip)
        .limit(limitNumber)
        .select('name email avatar isActive createdAt coins streak badges'),
      User.countDocuments(filter),
    ]);

    // Get test attempts for each student
    const studentsWithStats = await Promise.all(
      students.map(async (student) => {
        const attempts = await TestAttemptModel.find({
          user: student._id as mongoose.Types.ObjectId,
        }).select('score attemptedAt subjectAnalytics');

        const testsCompleted = attempts.length;
        const scores = attempts.map(a => a.score);
        const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
        const lastTestDate = attempts.length > 0 ? attempts[attempts.length - 1].attemptedAt : undefined;

        // Calculate subject-wise performance
        const performance: { [key: string]: number } = {};
        attempts.forEach(attempt => {
          if (attempt.subjectAnalytics) {
            attempt.subjectAnalytics.forEach((subject: any) => {
              if (!performance[subject.subject]) {
                performance[subject.subject] = 0;
              }
              performance[subject.subject] += subject.score;
            });
          }
        });

        // Average the subject scores
        Object.keys(performance).forEach(subject => {
          performance[subject] = Math.round(performance[subject] / attempts.length);
        });

        return {
          _id: (student._id as mongoose.Types.ObjectId).toString(),
          name: student.name,
          email: student.email,
          avatar: student.avatar,
          isActive: student.isActive,
          joinedAt: student.createdAt,
          testsCompleted,
          averageScore,
          bestScore,
          currentStreak: student.streak?.count || 0,
          coins: student.coins,
          lastTestDate,
          performance,
        };
      })
    );

    const totalPages = Math.ceil(totalCount / limitNumber);

    return {
      students: studentsWithStats,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalCount,
        limit: limitNumber,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
      },
    };
  }

  /**
   * Get student management statistics for tutor
   */
  public async getStudentStats(tutorId: string): Promise<StudentStats> {
    const tutor = await User.findById(tutorId);
    const studentIds = tutor?.tutorDetails?.students || [];

    const [
      totalStudents,
      activeStudents,
      pendingInvitations,
      testAttempts,
    ] = await Promise.all([
      User.countDocuments({ _id: { $in: studentIds } }),
      User.countDocuments({ _id: { $in: studentIds }, isActive: true }),
      StudentInvitation.countDocuments({ tutorId, status: InvitationStatus.PENDING }),
      TestAttemptModel.find({ user: { $in: studentIds } }).select('score'),
    ]);

    const totalTestAttempts = testAttempts.length;
    const averageScore = totalTestAttempts > 0 
      ? Math.round(testAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / totalTestAttempts)
      : 0;

    return {
      totalStudents,
      activeStudents,
      pendingInvitations,
      totalTestAttempts,
      averageScore,
    };
  }

  /**
   * Remove student from tutor
   */
  public async removeStudent(tutorId: string, studentId: string): Promise<void> {
    // Remove student from tutor's student list
    await User.findByIdAndUpdate(tutorId, {
      $pull: { 'tutorDetails.students': studentId },
      $inc: { 'tutorDetails.totalStudents': -1 },
    });

    // Update any pending invitations
    await StudentInvitation.updateMany(
      { tutorId, studentId, status: InvitationStatus.ACCEPTED },
      { status: InvitationStatus.REJECTED, rejectedAt: new Date() }
    );
  }

  /**
   * Resend invitation
   */
  public async resendInvitation(tutorId: string, invitationId: string): Promise<StudentInvitationDocument> {
    const invitation = await StudentInvitation.findOne({
      _id: invitationId,
      tutorId,
    });

    if (!invitation) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Invitation not found');
    }

    // Extend expiration date
    invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await invitation.save();

    return invitation;
  }
}

export default new StudentManagementService();
