const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    // For MVP, we'll use console logging instead of actual emails
    // You can set up real SMTP later
    this.transporter = null;
    
    if (process.env.EMAIL_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    }
  }

  async sendVerificationEmail(email, token) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    // For MVP testing, just log the URL
    logger.info(`📧 Verification email for ${email}:`);
    logger.info(`🔗 ${verificationUrl}`);
    
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'Verify your Fluxx account',
          html: `
            <h1>Welcome to Fluxx!</h1>
            <p>Click the link below to verify your email:</p>
            <a href="${verificationUrl}">${verificationUrl}</a>
            <p>This link expires in 24 hours.</p>
          `
        });
        logger.success(`Email sent to ${email}`);
      } catch (error) {
        logger.error('Email send error:', error.message);
      }
    }
    
    return verificationUrl;
  }

  async sendBanNotification(email, reason, expiresAt) {
    logger.warn(`🚫 Ban notification for ${email}: ${reason}`);
    
    if (this.transporter) {
      const expiryText = expiresAt 
        ? `Your ban will expire on ${expiresAt.toLocaleString()}`
        : 'This is a permanent ban';
        
      await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Fluxx Account Suspended',
        html: `
          <h1>Account Suspended</h1>
          <p>Your Fluxx account has been suspended due to: ${reason}</p>
          <p>${expiryText}</p>
          <p>If you believe this is a mistake, please contact support.</p>
        `
      });
    }
  }
}

module.exports = new EmailService();