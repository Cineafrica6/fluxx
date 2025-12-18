const moderationService = require('../services/moderationService');

// @desc    Submit a report
// @route   POST /api/reports
// @access  Private
const submitReport = async (req, res, next) => {
  try {
    const { reportedUserId, reason, additionalDetails } = req.body;
    const reporterId = req.user._id;

    // Can't report yourself
    if (reporterId.toString() === reportedUserId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot report yourself'
      });
    }

    const result = await moderationService.handleReport(
      reporterId,
      reportedUserId,
      reason,
      additionalDetails
    );

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my report stats
// @route   GET /api/reports/me
// @access  Private
const getMyReportStats = async (req, res, next) => {
  try {
    const stats = await moderationService.getReportStats(req.user._id);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitReport,
  getMyReportStats
};