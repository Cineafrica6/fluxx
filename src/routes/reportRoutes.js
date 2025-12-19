const express = require('express');
const router = express.Router();
const { submitReport, getMyReportStats } = require('../controllers/reportController');
const { reportValidation } = require('../middleware/validation');
const { protect } = require('../middleware/auth');

/**
 * @swagger
 * /api/reports:
 *   post:
 *     summary: Submit a report against a user
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reportedUserId
 *               - reason
 *             properties:
 *               reportedUserId:
 *                 type: string
 *                 description: ID of the user being reported
 *                 example: "507f1f77bcf86cd799439011"
 *               reason:
 *                 type: string
 *                 enum: [inappropriate_content, harassment, nudity, spam, other]
 *                 description: Reason for the report
 *                 example: "inappropriate_content"
 *               additionalDetails:
 *                 type: string
 *                 description: Optional additional details about the report
 *                 example: "User showed inappropriate content during video chat"
 *     responses:
 *       201:
 *         description: Report submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Report submitted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     userBanned:
 *                       type: boolean
 *                       description: Whether the reported user was automatically banned
 *                     reportCount:
 *                       type: number
 *                       description: Total reports against the user
 *       400:
 *         description: Bad request (cannot report yourself, validation error)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authorized
 */
router.post('/', protect, reportValidation, submitReport);

/**
 * @swagger
 * /api/reports/me:
 *   get:
 *     summary: Get current user's report statistics
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Report statistics for current user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     reportCount:
 *                       type: number
 *                       description: Total number of reports received
 *                     reportsLast24h:
 *                       type: number
 *                       description: Number of reports in the last 24 hours
 *                     isBanned:
 *                       type: boolean
 *                       description: Whether the user is currently banned
 *       401:
 *         description: Not authorized
 */
router.get('/me', protect, getMyReportStats);

module.exports = router;