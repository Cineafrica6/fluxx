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
 * Validate university email domain
 */
const isUniversityEmail = (email) => {
  // For MVP, you can either:
  // 1. Check against UNIVERSITY_EMAIL_DOMAINS array
  // 2. Just check if it ends with .edu
  // 3. Accept all emails for testing
  
  return email.endsWith('.edu'); // Simple check for now
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
  isUniversityEmail,
  cleanExpiredReports
};