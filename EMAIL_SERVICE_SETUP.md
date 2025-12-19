# Email Service Setup Guide

## Problem: Railway SMTP Blocking

Railway often blocks outbound SMTP connections (ports 587 and 465), which causes "Connection timeout" errors when trying to send emails via Gmail SMTP.

## Solutions

### Option 1: Use Resend (Recommended for Railway)

Resend is a modern email API that works perfectly with Railway and has a generous free tier.

#### Setup Steps:

1. **Sign up for Resend**
   - Go to [resend.com](https://resend.com)
   - Sign up for a free account (3,000 emails/month)

2. **Get API Key**
   - Go to API Keys section
   - Create a new API key
   - Copy the key (starts with `re_`)

3. **Set Environment Variables in Railway**
   ```
   EMAIL_SERVICE=resend
   RESEND_API_KEY=re_your_api_key_here
   EMAIL_FROM=noreply@yourdomain.com
   ```
   
   **Note:** For the free tier, you can use `onboarding@resend.dev` as the sender, but you'll need to verify your domain for production.

4. **Install Resend Package** (if not already installed)
   ```bash
   npm install resend
   ```

5. **Update Email Service**
   - The email service will automatically use Resend if `EMAIL_SERVICE=resend` is set

### Option 2: Use SendGrid

SendGrid is another reliable option that works well with Railway.

#### Setup Steps:

1. **Sign up for SendGrid**
   - Go to [sendgrid.com](https://sendgrid.com)
   - Free tier: 100 emails/day

2. **Create API Key**
   - Go to Settings → API Keys
   - Create a new API key with "Mail Send" permissions
   - Copy the key

3. **Set Environment Variables in Railway**
   ```
   EMAIL_SERVICE=sendgrid
   SENDGRID_API_KEY=SG.your_api_key_here
   EMAIL_FROM=noreply@yourdomain.com
   ```

4. **Install SendGrid Package**
   ```bash
   npm install @sendgrid/mail
   ```

### Option 3: Use Mailgun

Mailgun is another popular option.

#### Setup Steps:

1. **Sign up for Mailgun**
   - Go to [mailgun.com](https://mailgun.com)
   - Free tier: 5,000 emails/month

2. **Get API Key and Domain**
   - Go to Sending → API Keys
   - Copy your API key
   - Note your sending domain

3. **Set Environment Variables in Railway**
   ```
   EMAIL_SERVICE=mailgun
   MAILGUN_API_KEY=your_api_key_here
   MAILGUN_DOMAIN=mg.yourdomain.com
   EMAIL_FROM=noreply@yourdomain.com
   ```

4. **Install Mailgun Package**
   ```bash
   npm install mailgun.js
   ```

### Option 4: Keep Gmail SMTP (May Not Work on Railway)

If you want to keep using Gmail SMTP, the service will:
- Try port 465 (SSL) first (better for Railway)
- Fall back to port 587 (STARTTLS)
- Include retry logic
- Still return OTP in API response if email fails

**Environment Variables:**
```
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your_app_password
```

## Current Implementation

The email service currently supports:
- ✅ Gmail SMTP (with Railway workarounds)
- ⚠️ May fail on Railway due to network restrictions

## Recommended: Add Resend Support

I can update the email service to support Resend. Would you like me to:
1. Add Resend integration to the email service?
2. Keep Gmail as fallback?
3. Make it configurable via environment variable?

## Testing Email in Production

After setting up your email service:

1. **Check Railway Logs**
   - Look for "✅ Email service ready" on startup
   - Check for any connection errors

2. **Test Registration**
   - Register a new user
   - Check if email is received
   - If not, check logs for error details

3. **Verify OTP Still Works**
   - Even if email fails, OTP is returned in API response
   - Users can still verify manually

## Troubleshooting

### Gmail SMTP Timeout on Railway

**Symptoms:**
- "Connection timeout" error
- Works locally but not on Railway

**Cause:**
- Railway blocks outbound SMTP connections

**Solutions:**
1. Use Resend/SendGrid/Mailgun (recommended)
2. Use Railway Private Network (if available)
3. Use a different hosting provider that allows SMTP

### Email Not Sending

**Check:**
1. Environment variables are set correctly
2. API keys are valid
3. Sender email is verified (for Resend/SendGrid)
4. Check Railway logs for specific errors

### OTP Still Available

Even if email fails, the OTP is:
- Logged in server logs
- Returned in API response (for testing)
- Users can verify manually

