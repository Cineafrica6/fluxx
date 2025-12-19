const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  displayName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [20, 'Username must be at most 20 characters'],
    match: [/^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]{1,2}$/, 'Username can only contain letters, numbers, underscores, and hyphens, and cannot start or end with underscore or hyphen']
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationOTP: String,
  verificationOTPExpiry: Date,
  
  // Moderation
  reportCount: {
    type: Number,
    default: 0
  },
  reportsLast24h: [{
    timestamp: Date,
    reason: String
  }],
  isBanned: {
    type: Boolean,
    default: false
  },
  banExpiresAt: Date,
  banReason: String,
  
  // Admin
  isAdmin: {
    type: Boolean,
    default: false
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if user is currently banned
userSchema.methods.isCurrentlyBanned = function() {
  if (!this.isBanned) return false;
  
  if (this.banExpiresAt && this.banExpiresAt < new Date()) {
    // Ban expired
    this.isBanned = false;
    this.banExpiresAt = null;
    this.save();
    return false;
  }
  
  return true;
};

module.exports = mongoose.model('User', userSchema);