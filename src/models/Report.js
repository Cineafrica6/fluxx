const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    required: true,
    enum: ['inappropriate_content', 'harassment', 'nudity', 'spam', 'other']
  },
  additionalDetails: {
    type: String,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'dismissed'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  actionTaken: String,
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
reportSchema.index({ reportedUserId: 1, createdAt: -1 });
reportSchema.index({ status: 1 });

module.exports = mongoose.model('Report', reportSchema);