import Joi from 'joi';

/**
 * Validation schema for getting all students
 */
export const getAllStudentsValidation = Joi.object({
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(12),
    search: Joi.string().trim().allow('').max(100),
    status: Joi.string().valid('all', 'active', 'inactive').default('all'),
    examGoal: Joi.string().valid('all', 'JEE', 'BITSAT').default('all'),
    sortBy: Joi.string().valid('createdAt', 'name', 'email', 'averageScore').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    minScore: Joi.number().min(0).max(100),
    maxScore: Joi.number().min(0).max(100),
    hasAttempts: Joi.string().valid('all', 'true', 'false').default('all'),
  }).custom((value, helpers) => {
    // Ensure minScore is less than maxScore if both are provided
    if (value.minScore !== undefined && value.maxScore !== undefined) {
      if (value.minScore > value.maxScore) {
        return helpers.error('any.invalid', { 
          message: 'minScore must be less than or equal to maxScore' 
        });
      }
    }
    return value;
  })
});

/**
 * Validation schema for updating student status
 */
export const updateStudentStatusValidation = Joi.object({
  params: Joi.object({
    studentId: Joi.string().required().pattern(/^[0-9a-fA-F]{24}$/, 'valid ObjectId')
      .messages({
        'string.pattern.name': 'Invalid student ID format'
      })
  }),
  body: Joi.object({
    isActive: Joi.boolean().required()
      .messages({
        'any.required': 'isActive field is required',
        'boolean.base': 'isActive must be a boolean value'
      })
  })
});

/**
 * Validation schema for sending student notifications
 */
export const sendStudentNotificationValidation = Joi.object({
  body: Joi.object({
    studentIds: Joi.array()
      .items(
        Joi.string().pattern(/^[0-9a-fA-F]{24}$/, 'valid ObjectId')
          .messages({
            'string.pattern.name': 'Invalid student ID format'
          })
      )
      .min(1)
      .max(100)
      .required()
      .messages({
        'array.min': 'At least one student ID is required',
        'array.max': 'Cannot send notification to more than 100 students at once',
        'any.required': 'studentIds field is required'
      }),
    subject: Joi.string()
      .trim()
      .min(1)
      .max(200)
      .required()
      .messages({
        'string.empty': 'Subject cannot be empty',
        'string.min': 'Subject must be at least 1 character long',
        'string.max': 'Subject cannot exceed 200 characters',
        'any.required': 'Subject field is required'
      }),
    message: Joi.string()
      .trim()
      .min(1)
      .max(2000)
      .required()
      .messages({
        'string.empty': 'Message cannot be empty',
        'string.min': 'Message must be at least 1 character long',
        'string.max': 'Message cannot exceed 2000 characters',
        'any.required': 'Message field is required'
      })
  })
});

/**
 * Validation schema for student ID parameter
 */
export const studentIdValidation = Joi.object({
  params: Joi.object({
    studentId: Joi.string().required().pattern(/^[0-9a-fA-F]{24}$/, 'valid ObjectId')
      .messages({
        'string.pattern.name': 'Invalid student ID format',
        'any.required': 'Student ID is required'
      })
  })
});
