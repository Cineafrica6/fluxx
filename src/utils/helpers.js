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

/**
 * Validate username format
 * Rules:
 * - 3-20 characters
 * - Only alphanumeric characters, underscores, and hyphens
 * - Cannot start or end with underscore or hyphen
 * - Case-insensitive (will be converted to lowercase)
 */
const validateUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }

  const trimmed = username.trim();
  
  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  
  if (trimmed.length > 20) {
    return { valid: false, error: 'Username must be at most 20 characters' };
  }
  
  // Only alphanumeric, underscores, and hyphens
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }
  
  // Cannot start or end with underscore or hyphen (unless it's 1-2 chars of just alphanumeric)
  if (trimmed.length > 2 && (/^[_-]|[_-]$/.test(trimmed))) {
    return { valid: false, error: 'Username cannot start or end with underscore or hyphen' };
  }
  
  return { valid: true, normalized: trimmed.toLowerCase() };
};

module.exports = {
  generateDisplayName,
  generateUniqueDisplayName,
  generateVerificationToken,
  generateOTP,
  isUniversityEmail,
  cleanExpiredReports,
  validateUsername
};