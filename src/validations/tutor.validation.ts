import Joi from "joi";

const tutorRegister = Joi.object({
  body: Joi.object({
    // Basic Info
    name: Joi.string().required().trim().min(2).max(50),
    email: Joi.string().email().required().trim().lowercase(),
    password: Joi.string().min(8).required(),
    
    // Tutor Specific Info
    instituteName: Joi.string().required().trim().min(2).max(100),
    examFocus: Joi.array().items(Joi.string().valid("JEE", "BITSAT")).min(1).required(),
    subjects: Joi.array().items(Joi.string().valid("Physics", "Chemistry", "Mathematics")).min(1).required(),
    bio: Joi.string().required().trim().min(10).max(500),
    experience: Joi.number().integer().min(0).max(50).required(),
    qualifications: Joi.string().required().trim().min(2).max(200),
    
    // Contact Info
    phone: Joi.string().required(),
    address: Joi.object({
      street: Joi.string().required().trim(),
      city: Joi.string().required().trim(),
      state: Joi.string().required().trim(),
      pincode: Joi.string().pattern(/^\d{6}$/).required(),
    }).required(),
    
    // Plan Selection
    planType: Joi.string().valid("starter", "pro").required(),
    
    // Payment Info (for later processing)
    paymentMethod: Joi.string().valid("razorpay", "stripe").default("razorpay"),
  }),
});

const verifyTutorEmail = Joi.object({
  body: Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).pattern(/^\d{6}$/).required(),
  }),
});

const sendTutorOTP = Joi.object({
  body: Joi.object({
    email: Joi.string().email().required(),
  }),
});

const updateTutorProfile = Joi.object({
  body: Joi.object({
    name: Joi.string().trim().min(2).max(50),
    instituteName: Joi.string().trim().min(2).max(100),
    examFocus: Joi.array().items(Joi.string().valid("JEE", "BITSAT")).min(1),
    subjects: Joi.array().items(Joi.string().valid("Physics", "Chemistry", "Mathematics")).min(1),
    bio: Joi.string().trim().min(10).max(500),
    experience: Joi.number().integer().min(0).max(50),
    qualifications: Joi.string().trim().min(2).max(200),
    phone: Joi.string(),
    address: Joi.object({
      street: Joi.string().trim(),
      city: Joi.string().trim(),
      state: Joi.string().trim(),
      pincode: Joi.string().pattern(/^\d{6}$/),
    }),
  }),
});

const generateInviteCode = Joi.object({
  body: Joi.object({
    expiresInDays: Joi.number().integer().min(1).max(365).default(30),
    maxUses: Joi.number().integer().min(1).max(1000).default(50),
  }),
});

export default {
  tutorRegister,
  verifyTutorEmail,
  sendTutorOTP,
  updateTutorProfile,
  generateInviteCode,
};
