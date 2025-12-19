const { body, validationResult } = require('express-validator');
const { isUniversityEmail } = require('../utils/helpers');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

const registerValidation = [
  body('email')
    .isEmail().withMessage('Please provide a valid email'),
    // University email validation disabled for testing
    // .custom((value) => {
    //   if (!isUniversityEmail(value)) {
    //     throw new Error('Please use a university email address');
    //   }
    //   return true;
    // }),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('displayName')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 20 }).withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]{1,2}$/).withMessage('Username can only contain letters, numbers, underscores, and hyphens, and cannot start or end with underscore or hyphen')
    .toLowerCase(),
  validate
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
];

const reportValidation = [
  body('reportedUserId').notEmpty().withMessage('Reported user ID is required'),
  body('reason')
    .isIn(['inappropriate_content', 'harassment', 'nudity', 'spam', 'other'])
    .withMessage('Invalid report reason'),
  validate
];

module.exports = {
  registerValidation,
  loginValidation,
  reportValidation
};