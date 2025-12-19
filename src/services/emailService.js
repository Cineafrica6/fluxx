const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    // Initialize Gmail SMTP transporter
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS // Gmail app password
        }
      });
      
      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          logger.error('Email service configuration error:', error);
        } else {
          logger.success('✅ Email service ready (Gmail SMTP)');
        }
      });
    } else {
      logger.warn('⚠️ Email service not configured. Set EMAIL_USER and EMAIL_PASS in .env');
      this.transporter = null;
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

  async sendVerificationOTP(email, otp) {
    // Always log OTP for testing/debugging
    logger.info(`📧 Verification OTP for ${email}:`);
    logger.info(`🔢 OTP: ${otp}`);
    logger.info(`⏰ OTP expires in 10 minutes`);
    
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"Fluxx" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'Verify your Fluxx account - OTP',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #667eea; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .otp-box { background: white; border: 3px solid #667eea; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
                .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea; font-family: 'Courier New', monospace; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Welcome to Fluxx</h1>
                </div>
                <div class="content">
                  <p>Hi there!</p>
                  <p>Thank you for signing up for Fluxx. To complete your registration, please enter the verification code below:</p>
                  
                  <div class="otp-box">
                    <p style="margin: 0 0 10px 0; color: #666;">Your verification code:</p>
                    <div class="otp-code">${otp}</div>
                  </div>
                  
                  <p><strong>This code expires in 10 minutes.</strong></p>
                  
                  <p>If you didn't request this code, please ignore this email.</p>
                  
                  <p>Best regards,<br>The Fluxx Team</p>
                </div>
                <div class="footer">
                  <p>This is an automated email. Please do not reply.</p>
                </div>
              </div>
            </body>
            </html>
          `,
          text: `Welcome to Fluxx!\n\nYour verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`
        });
        logger.success(`✅ OTP email sent successfully to ${email}`);
      } catch (error) {
        logger.error('❌ Email send error:', error.message);
        // Still log OTP even if email fails
      }
    } else {
      logger.warn('⚠️ Email transporter not configured. OTP logged above for testing.');
    }
    
    return otp;
  }

  async sendBanNotification(email, reason, expiresAt) {
    logger.warn(`🚫 Ban notification for ${email}: ${reason}`);
    
    if (this.transporter) {
      const expiryText = expiresAt 
        ? `Your ban will expire on ${expiresAt.toLocaleString()}`
        : 'This is a permanent ban';
        
      try {
        await this.transporter.sendMail({
          from: `"Fluxx" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'Fluxx Account Suspended',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #dc3545; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>⚠️ Account Suspended</h1>
                </div>
                <div class="content">
                  <p>Hello,</p>
                  <p>We're writing to inform you that your Fluxx account has been suspended.</p>
                  
                  <div class="warning">
                    <p><strong>Reason:</strong> ${reason}</p>
                    <p><strong>Status:</strong> ${expiryText}</p>
                  </div>
                  
                  <p>If you believe this is a mistake, please contact our support team.</p>
                  
                  <p>Best regards,<br>The Fluxx Team</p>
                </div>
              </div>
            </body>
            </html>
          `,
          text: `Your Fluxx account has been suspended.\n\nReason: ${reason}\nStatus: ${expiryText}\n\nIf you believe this is a mistake, please contact support.`
        });
        logger.success(`✅ Ban notification email sent to ${email}`);
      } catch (error) {
        logger.error('❌ Email send error:', error.message);
      }
    }
  }
}

module.exports = new EmailService();