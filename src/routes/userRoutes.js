const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');

// @desc    Get user profile
// @route   GET /api/users/:userId
// @access  Private
router.get('/:userId', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).select('-password -verificationToken');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        displayName: user.displayName,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;