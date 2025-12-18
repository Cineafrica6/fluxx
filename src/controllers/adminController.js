const User = require('../models/User');
const Report = require('../models/Report');
const moderationService = require('../services/moderationService');

// @desc    Get all reports
// @route   GET /api/admin/reports
// @access  Private (Admin only)
const getAllReports = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = status ? { status } : {};

    const reports = await Report.find(query)
      .populate('reporterId', 'email displayName')
      .populate('reportedUserId', 'email displayName reportCount isBanned')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Report.countDocuments(query);

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin only)
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, banned } = req.query;

    const query = {};
    if (banned !== undefined) {
      query.isBanned = banned === 'true';
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Ban a user
// @route   POST /api/admin/users/:userId/ban
// @access  Private (Admin only)
const banUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await moderationService.banUser(user, reason || 'Admin action');

    res.json({
      success: true,
      message: 'User banned successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Unban a user
// @route   POST /api/admin/users/:userId/unban
// @access  Private (Admin only)
const unbanUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    await moderationService.unbanUser(userId);

    res.json({
      success: true,
      message: 'User unbanned successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update report status
// @route   PATCH /api/admin/reports/:reportId
// @access  Private (Admin only)
const updateReportStatus = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const { status, actionTaken } = req.body;

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    report.status = status;
    report.actionTaken = actionTaken;
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();

    await report.save();

    res.json({
      success: true,
      message: 'Report updated successfully',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Private (Admin only)
const getDashboardStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const bannedUsers = await User.countDocuments({ isBanned: true });
    const pendingReports = await Report.countDocuments({ status: 'pending' });
    const totalReports = await Report.countDocuments();

    res.json({
      success: true,
      data: {
        totalUsers,
        bannedUsers,
        pendingReports,
        totalReports
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllReports,
  getAllUsers,
  banUser,
  unbanUser,
  updateReportStatus,
  getDashboardStats
};