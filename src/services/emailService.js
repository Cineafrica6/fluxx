const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    // Check if Railway is blocking SMTP (Free/Trial/Hobby plans)
    const isRailwayFreeTier = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID;
    
    // Initialize Gmail SMTP transporter
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      // Railway Free/Trial/Hobby plans block SMTP - emails will fail
      if (isRailwayFreeTier && process.env.NODE_ENV === 'production') {
        logger.warn('⚠️ Railway Free/Trial/Hobby plans block SMTP connections');
        logger.warn('⚠️ Email sending will fail. OTP will be logged and returned in API response.');
        logger.warn('💡 Solutions:');
        logger.warn('   1. Upgrade Railway to Pro plan ($20/month)');
        logger.warn('   2. Use a different hosting provider (Render, Fly.io, etc.)');
        logger.warn('   3. Use an email API service (requires domain verification)');
        logger.warn('   4. Check Railway logs for OTP codes');
        this.transporter = null; // Don't even try on Railway free tier
        return;
      }
      
      // Try multiple configurations for Railway compatibility
      // Railway Pro plan allows SMTP, but we'll try 465 (SSL) first
      const configs = [
        // Configuration 1: Port 465 with SSL (most reliable)
        {
          service: 'gmail',
          host: 'smtp.gmail.com',
          port: 465,
          secure: true, // SSL
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          },
          tls: {
            rejectUnauthorized: false
          },
          connectionTimeout: 30000, // 30 seconds
          greetingTimeout: 30000,
          socketTimeout: 30000
        },
        // Configuration 2: Port 587 with STARTTLS (fallback)
        {
          service: 'gmail',
          host: 'smtp.gmail.com',
          port: 587,
          secure: false, // STARTTLS
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          },
          tls: {
            rejectUnauthorized: false
          },
          connectionTimeout: 30000,
          greetingTimeout: 30000,
          socketTimeout: 30000
        }
      ];
      
      // Try to create transporter with first config, fallback to second
      this.transporter = this.createTransporterWithFallback(configs);
      
      // Verify connection with retry logic (async, don't block)
      this.verifyConnection().catch(err => {
        logger.warn('Email verification will retry on first send');
      });
    } else {
      logger.warn('⚠️ Email service not configured. Set EMAIL_USER and EMAIL_PASS in .env');
      this.transporter = null;
    }
  }

  createTransporterWithFallback(configs) {
    // Start with the first config (port 465 with SSL - best for Railway)
    const config = configs[0];
    logger.info(`Attempting email connection with port ${config.port} (${config.secure ? 'SSL' : 'STARTTLS'})...`);
    
    return nodemailer.createTransport(config);
  }

  async verifyConnection(retries = 2) {
    if (!this.transporter) return;
    
    for (let i = 0; i < retries; i++) {
      try {
        await this.transporter.verify();
        logger.success('✅ Email service ready (Gmail SMTP)');
        return true;
      } catch (error) {
        logger.warn(`Email service verification attempt ${i + 1}/${retries} failed:`, error.message);
        
        // If connection timeout, try recreating with different config
        if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
          logger.warn('Connection timeout detected. This is common on Railway.');
          logger.warn('Email will still be attempted on send, but may fail if Railway blocks SMTP.');
          
          // Try alternative configuration
          if (i === 0 && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            logger.info('Attempting alternative SMTP configuration...');
            try {
              // Try port 587 as fallback
              this.transporter = nodemailer.createTransport({
                service: 'gmail',
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                auth: {
                  user: process.env.EMAIL_USER,
                  pass: process.env.EMAIL_PASS
                },
                tls: {
                  rejectUnauthorized: false
                },
                connectionTimeout: 30000,
                greetingTimeout: 30000,
                socketTimeout: 30000
              });
              logger.info('Switched to port 587 configuration');
            } catch (configError) {
              logger.error('Failed to switch configuration:', configError.message);
            }
          }
        }
        
        if (i === retries - 1) {
          logger.warn('⚠️ Email service verification failed - emails may still work on send');
          logger.warn('Railway may block SMTP connections. Consider using Resend, SendGrid, or Mailgun.');
          return false;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 3000 * (i + 1)));
      }
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
        // Retry logic for email sending
        let lastError;
        const maxRetries = 3;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
            logger.success(`✅ OTP email sent successfully to ${email} (attempt ${attempt})`);
            return otp; // Success, exit retry loop
          } catch (error) {
            lastError = error;
            logger.warn(`⚠️ Email send attempt ${attempt}/${maxRetries} failed:`, error.message);
            
            // If not the last attempt, wait before retrying
            if (attempt < maxRetries) {
              const delay = 2000 * attempt; // Exponential backoff: 2s, 4s, 6s
              logger.info(`Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              
              // Re-verify connection before retry
              await this.verifyConnection(1);
            }
          }
        }
        
        // All retries failed
        logger.error('❌ Email send failed after all retries:', lastError.message);
        logger.error('Error details:', {
          code: lastError.code,
          command: lastError.command,
          response: lastError.response
        });
        
        // If it's a connection timeout, provide Railway-specific guidance
        if (lastError.message.includes('timeout') || lastError.message.includes('ETIMEDOUT')) {
          logger.error('');
          logger.error('🚨 RAILWAY SMTP BLOCKING DETECTED');
          logger.error('Railway often blocks outbound SMTP connections.');
          logger.error('');
          logger.error('Solutions:');
          logger.error('1. Use a dedicated email service (recommended):');
          logger.error('   - Resend (resend.com) - Free tier: 3,000 emails/month');
          logger.error('   - SendGrid (sendgrid.com) - Free tier: 100 emails/day');
          logger.error('   - Mailgun (mailgun.com) - Free tier: 5,000 emails/month');
          logger.error('');
          logger.error('2. Or try Railway Private Network (if available on your plan)');
          logger.error('');
          logger.error('3. The OTP is still logged above and returned in API response for manual verification.');
        }
        
        throw lastError; // Re-throw to be handled by caller
      } catch (error) {
        logger.error('❌ Email send error (final):', error.message);
        // Don't throw - still return OTP so user can verify
        // The OTP is logged above for manual verification if needed
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