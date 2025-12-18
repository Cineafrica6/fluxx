const User = require('../models/User');
const authService = require('../services/authService');
const emailService = require('../services/emailService');
const { generateUniqueDisplayName, generateOTP } = require('../utils/helpers');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Generate unique display name
    const displayName = await generateUniqueDisplayName(User);

    // Generate 6-digit OTP
    const verificationOTP = generateOTP();
    const verificationOTPExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user
    const user = await User.create({
      email,
      password,
      displayName,
      verificationOTP,
      verificationOTPExpiry
    });

    // Send verification OTP email
    await emailService.sendVerificationOTP(email, verificationOTP);

    // Generate JWT
    const token = authService.generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your account with the OTP.',
      data: {
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          isVerified: user.isVerified
        },
        token,
        otp: verificationOTP // Include OTP in response for testing (remove in production)
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

// @desc    Verify email with OTP
// @route   POST /api/auth/verify-email
// @access  Public
const verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    // Check if OTP matches and is not expired
    if (user.verificationOTP !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    if (!user.verificationOTPExpiry || user.verificationOTPExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    // Verify user
    user.isVerified = true;
    user.verificationOTP = undefined;
    user.verificationOTPExpiry = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend verification OTP
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    // Generate new OTP
    const verificationOTP = generateOTP();
    const verificationOTPExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.verificationOTP = verificationOTP;
    user.verificationOTPExpiry = verificationOTPExpiry;
    await user.save();

    // Send new OTP
    await emailService.sendVerificationOTP(email, verificationOTP);

    res.json({
      success: true,
      message: 'OTP sent successfully. Please check your email.',
      data: {
        otp: verificationOTP // Include OTP in response for testing (remove in production)
      }
    });
  } catch (error) {
    next(error);
  }
};

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
  verifyEmail,
  resendOTP,
  getMe
};