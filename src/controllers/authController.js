const User = require('../models/User');
const authService = require('../services/authService');
const { validateUsername } = require('../utils/helpers');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body;

    // Validate username format
    const usernameValidation = validateUsername(displayName);
    if (!usernameValidation.valid) {
      return res.status(400).json({
        success: false,
        message: usernameValidation.error
      });
    }

    const normalizedUsername = usernameValidation.normalized;

    // Check if user exists with email
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Check if username is already taken
    const existingUserByUsername = await User.findOne({ displayName: normalizedUsername });
    if (existingUserByUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username is already taken'
      });
    }

    // Create user (auto-verified)
    const user = await User.create({
      email,
      password,
      displayName: normalizedUsername,
      isVerified: true // Auto-verify on registration
    });

    // Generate JWT
    const token = authService.generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Your account is ready to use.',
      data: {
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          isVerified: user.isVerified
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is banned
    if (user.isCurrentlyBanned()) {
      return res.status(403).json({
        success: false,
        message: 'Your account is banned',
        banExpiresAt: user.banExpiresAt,
        banReason: user.banReason
      });
    }

    // Generate JWT
    const token = authService.generateToken(user._id);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          isVerified: user.isVerified,
          isAdmin: user.isAdmin
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// OTP verification endpoints removed - users are now auto-verified on registration

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe
};