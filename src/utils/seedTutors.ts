import mongoose from 'mongoose';

// This is a utility to create mock tutor data for testing
// You can run this to populate your database with sample tutors

const User = require('../models/user.model').default;

const mockTutors = [
  {
    name: "Dr. Rajesh Kumar",
    email: "rajesh.kumar@testbit.com",
    password: "password123",
    role: "tutor",
    isEmailVerified: true,
    tutorDetails: {
      examFocus: ["JEE", "BITSAT"],
      students: [],
    },
    createdAt: new Date('2023-01-15'),
  },
  {
    name: "Prof. Priya Sharma",
    email: "priya.sharma@testbit.com",
    password: "password123",
    role: "tutor",
    isEmailVerified: true,
    tutorDetails: {
      examFocus: ["NEET"],
      students: [],
    },
    createdAt: new Date('2023-02-20'),
  },
  {
    name: "Dr. Amit Patel",
    email: "amit.patel@testbit.com",
    password: "password123",
    role: "tutor",
    isEmailVerified: false,
    tutorDetails: {
      examFocus: ["JEE"],
      students: [],
    },
    createdAt: new Date('2023-03-10'),
  },
  {
    name: "Ms. Sneha Gupta",
    email: "sneha.gupta@testbit.com",
    password: "password123",
    role: "tutor",
    isEmailVerified: true,
    tutorDetails: {
      examFocus: ["JEE", "NEET"],
      students: [],
    },
    createdAt: new Date('2023-04-05'),
  },
  {
    name: "Dr. Vikram Singh",
    email: "vikram.singh@testbit.com",
    password: "password123",
    role: "tutor",
    isEmailVerified: false,
    tutorDetails: {
      examFocus: ["BITSAT"],
      students: [],
    },
    createdAt: new Date('2023-05-12'),
  },
  {
    name: "Prof. Anita Desai",
    email: "anita.desai@testbit.com",
    password: "password123",
    role: "tutor",
    isEmailVerified: true,
    tutorDetails: {
      examFocus: ["JEE", "BITSAT", "NEET"],
      students: [],
    },
    createdAt: new Date('2023-06-18'),
  },
  {
    name: "Dr. Ravi Mehta",
    email: "ravi.mehta@testbit.com",
    password: "password123",
    role: "tutor",
    isEmailVerified: true,
    tutorDetails: {
      examFocus: ["JEE"],
      students: [],
    },
    createdAt: new Date('2023-07-22'),
  },
  {
    name: "Ms. Kavya Reddy",
    email: "kavya.reddy@testbit.com",
    password: "password123",
    role: "tutor",
    isEmailVerified: false,
    tutorDetails: {
      examFocus: ["NEET"],
      students: [],
    },
    createdAt: new Date('2023-08-14'),
  },
  {
    name: "Dr. Suresh Iyer",
    email: "suresh.iyer@testbit.com",
    password: "password123",
    role: "tutor",
    isEmailVerified: true,
    tutorDetails: {
      examFocus: ["JEE", "BITSAT"],
      students: [],
    },
    createdAt: new Date('2023-09-08'),
  },
  {
    name: "Prof. Meera Joshi",
    email: "meera.joshi@testbit.com",
    password: "password123",
    role: "tutor",
    isEmailVerified: true,
    tutorDetails: {
      examFocus: ["NEET", "JEE"],
      students: [],
    },
    createdAt: new Date('2023-10-03'),
  },
  {
    name: "Dr. Arjun Nair",
    email: "arjun.nair@testbit.com",
    password: "password123",
    role: "tutor",
    isEmailVerified: false,
    tutorDetails: {
      examFocus: ["BITSAT"],
      students: [],
    },
    createdAt: new Date('2023-11-15'),
  },
  {
    name: "Ms. Deepika Agarwal",
    email: "deepika.agarwal@testbit.com",
    password: "password123",
    role: "tutor",
    isEmailVerified: true,
    tutorDetails: {
      examFocus: ["JEE"],
      students: [],
    },
    createdAt: new Date('2023-12-01'),
  },
];

export const seedTutors = async () => {
  try {
    console.log('🌱 Seeding tutor data...');
    
    // Check if tutors already exist
    const existingTutors = await User.find({ role: 'tutor' });
    
    if (existingTutors.length > 0) {
      console.log(`📊 Found ${existingTutors.length} existing tutors. Skipping seed.`);
      return;
    }
    
    // Create tutors
    const createdTutors = await User.insertMany(mockTutors);
    
    console.log(`✅ Successfully created ${createdTutors.length} mock tutors`);
    console.log('📋 Mock tutors created:');
    createdTutors.forEach((tutor: any, index: number) => {
      console.log(`   ${index + 1}. ${tutor.name} (${tutor.email}) - ${tutor.isEmailVerified ? 'Active' : 'Pending'}`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding tutors:', error);
    throw error;
  }
};

// Function to clear all tutors (for testing)
export const clearTutors = async () => {
  try {
    const result = await User.deleteMany({ role: 'tutor' });
    console.log(`🗑️  Deleted ${result.deletedCount} tutors`);
  } catch (error) {
    console.error('❌ Error clearing tutors:', error);
    throw error;
  }
};

// If this file is run directly, seed the data
if (require.main === module) {
  // This would require database connection setup
  console.log('Run this seeder from your main application after database connection is established');
}
