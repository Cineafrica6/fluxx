const crypto = require('crypto');
const { DISPLAY_NAME_PREFIX } = require('./constants');

/**
 * Generate random display name: Fluxx_XXXX
 */
const generateDisplayName = () => {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${DISPLAY_NAME_PREFIX}${randomNum}`;
};

/**
 * Generate unique display name (check DB for uniqueness)
 */
const generateUniqueDisplayName = async (UserModel) => {
  let displayName;
  let isUnique = false;
  
  while (!isUnique) {
    displayName = generateDisplayName();
    const existing = await UserModel.findOne({ displayName });
    if (!existing) {
      isUnique = true;
    }
  }
  
  return displayName;
};

/**
 * Generate random token for email verification
 */
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Generate 6-digit OTP for email verification
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

/**
 * Validate university email domain
 * For testing: accepts all emails
 */
const isUniversityEmail = (email) => {
  // For testing: accept all emails
  // TODO: Re-enable university email validation in production
  return true;
  
  // Production code (commented out for testing):
  // return email.endsWith('.edu');
};

/**
 * Clean expired reports from last 24h array
 */
const cleanExpiredReports = (reportsArray) => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return reportsArray.filter(report => report.timestamp > twentyFourHoursAgo);
};

module.exports = {
  generateDisplayName,
  generateUniqueDisplayName,
  generateVerificationToken,
  generateOTP,
  isUniversityEmail,
  cleanExpiredReports
};