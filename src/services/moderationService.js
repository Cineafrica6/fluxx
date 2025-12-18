const User = require('../models/User');
const Report = require('../models/Report');
const { BAN_THRESHOLDS, BAN_DURATION } = require('../utils/constants');
const { cleanExpiredReports } = require('../utils/helpers');
const emailService = require('./emailService');
const logger = require('../utils/logger');

class ModerationService {
  async handleReport(reporterId, reportedUserId, reason, additionalDetails) {
    // Create report
    const report = await Report.create({
      reporterId,
      reportedUserId,
      reason,
      additionalDetails
    });

    // Get reported user
    const reportedUser = await User.findById(reportedUserId);
    if (!reportedUser) {
      throw new Error('Reported user not found');
    }

    // Clean expired reports from last 24h
    reportedUser.reportsLast24h = cleanExpiredReports(reportedUser.reportsLast24h);

    // Add new report to 24h tracking
    reportedUser.reportsLast24h.push({
      timestamp: new Date(),
      reason
    });

    // Increment total report count
    reportedUser.reportCount += 1;

    // Check for auto-ban conditions
    const shouldBan = await this.checkBanConditions(reportedUser);
    
    if (shouldBan) {
      await this.banUser(reportedUser, reason);
    }

    await reportedUser.save();

    logger.info(`Report created: ${reporterId} reported ${reportedUserId} for ${reason}`);

    return {
      report,
      userBanned: shouldBan
    };
  }

  async checkBanConditions(user) {
    // Rule 1: 3 reports in 24 hours = 24h ban
    if (user.reportsLast24h.length >= BAN_THRESHOLDS.REPORTS_24H) {
      return true;
    }

    // Rule 2: 5 total reports = manual review (auto-ban for now)
    if (user.reportCount >= BAN_THRESHOLDS.TOTAL_REPORTS) {
      return true;
    }

    return false;
  }

  async banUser(user, reason) {
    const banDuration = user.reportCount >= BAN_THRESHOLDS.TOTAL_REPORTS
      ? null // Permanent ban
      : BAN_DURATION.TEMPORARY; // 24h ban

    user.isBanned = true;
    user.banReason = reason || 'Multiple reports';
    user.banExpiresAt = banDuration ? new Date(Date.now() + banDuration) : null;

    await user.save();

    // Send ban notification
    await emailService.sendBanNotification(
      user.email,
      user.banReason,
      user.banExpiresAt
    );

    logger.warn(`🚫 User banned: ${user.email} (${user.banExpiresAt ? 'temporary' : 'permanent'})`);
  }

  async unbanUser(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.isBanned = false;
    user.banExpiresAt = null;
    user.banReason = null;

    await user.save();

    logger.info(`✅ User unbanned: ${user.email}`);
  }

  async getReportStats(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      totalReports: user.reportCount,
      reportsLast24h: user.reportsLast24h.length,
      isBanned: user.isCurrentlyBanned(),
      banExpiresAt: user.banExpiresAt
    };
  }
}

module.exports = new ModerationService();