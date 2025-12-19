# Railway Deployment Guide

This guide covers deploying the Fluxx backend to Railway and configuring environment variables.

## Environment Variables Setup

### Required Environment Variables

Set these in your Railway project settings:

#### 1. Server Configuration
```
PORT=5000
NODE_ENV=production
```

#### 2. Frontend URL (for CORS)
```
FRONTEND_URL=https://fluxx-chi.vercel.app
```

#### 3. Database
```
MONGODB_URI=your_mongodb_connection_string
```
- Use your MongoDB Atlas connection string
- Make sure to URL-encode special characters in the password

#### 4. JWT Secret
```
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
```
- **IMPORTANT**: Use a strong, random secret key in production
- Generate a secure random string (at least 32 characters)

#### 5. Email Configuration (Gmail SMTP)
```
EMAIL_USER=clovershizzle@gmail.com
EMAIL_PASS=xqkxjpevgwfvffxg
```

**Important Notes for Gmail SMTP:**
- `EMAIL_PASS` must be a Gmail **App Password**, not your regular password
- To generate an App Password:
  1. Go to your Google Account settings
  2. Enable 2-Step Verification (required for App Passwords)
  3. Go to Security → App passwords
  4. Generate a new app password for "Mail"
  5. Use the 16-character password (remove spaces if any)

**Troubleshooting Email Issues:**
- If emails aren't sending, check Railway logs for SMTP errors
- Verify `EMAIL_USER` and `EMAIL_PASS` are set correctly
- Ensure "Less secure app access" is enabled OR 2FA with App Password is set up
- Check that Railway can reach `smtp.gmail.com:587` (some networks block this)

#### 6. Moderation Settings (Optional)
```
BAN_THRESHOLD_24H=3
BAN_THRESHOLD_TOTAL=5
```

#### 7. STUN Server (Optional)
```
STUN_SERVER=stun:stun.l.google.com:19302
```

## CORS Configuration

The backend is configured to allow requests from:
- `https://fluxx-chi.vercel.app` (production frontend)
- `http://localhost:3000` (local development)
- `http://localhost:5173` (Vite dev server)
- `http://localhost:5000` (local backend)

To add more origins, update `src/app.js` and `src/config/socket.js`.

## Deployment Steps

1. **Connect Repository**
   - Connect your GitHub repository to Railway
   - Railway will auto-detect Node.js

2. **Set Environment Variables**
   - Go to your Railway project → Variables
   - Add all required environment variables listed above

3. **Configure Build Settings**
   - Railway should auto-detect `package.json`
   - Build command: `npm install`
   - Start command: `npm start`

4. **Deploy**
   - Railway will automatically deploy on push to main branch
   - Check the Deployments tab for build logs

5. **Get Your Backend URL**
   - Railway provides a public URL (e.g., `https://fluxx-production.up.railway.app`)
   - Use this URL in your frontend's `VITE_API_BASE_URL`

## Verifying Deployment

### 1. Health Check
```bash
curl https://your-railway-url.railway.app/health
```
Should return:
```json
{"status":"ok","timestamp":"..."}
```

### 2. API Documentation
Visit: `https://your-railway-url.railway.app/api-docs`

### 3. Test Registration
```bash
curl -X POST https://your-railway-url.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

## Troubleshooting

### Email Not Sending

1. **Check Railway Logs**
   - Go to Railway → Deployments → View Logs
   - Look for email-related errors

2. **Verify Environment Variables**
   - Ensure `EMAIL_USER` and `EMAIL_PASS` are set
   - Check for typos or extra spaces

3. **Test SMTP Connection**
   - The app logs email connection status on startup
   - Look for "✅ Email service ready" or error messages

4. **Common Issues:**
   - **"Invalid login"**: App password is incorrect
   - **"Connection timeout"**: Railway network blocking SMTP
   - **"Authentication failed"**: Need to use App Password, not regular password

### CORS Errors

If you see CORS errors from your frontend:

1. **Check Frontend URL**
   - Ensure `FRONTEND_URL` matches your Vercel deployment exactly
   - Include `https://` and no trailing slash

2. **Check Allowed Origins**
   - Verify `https://fluxx-chi.vercel.app` is in the allowed origins list
   - Check both `src/app.js` (REST API) and `src/config/socket.js` (WebSocket)

3. **Check Request Headers**
   - Ensure `credentials: true` is set in frontend fetch requests
   - Include `Authorization` header for authenticated requests

### Database Connection Issues

1. **Check MongoDB URI**
   - Verify connection string is correct
   - Ensure IP whitelist includes Railway's IPs (or use `0.0.0.0/0` for testing)

2. **Check Network**
   - Railway should be able to reach MongoDB Atlas
   - Check MongoDB Atlas network access settings

## Production Checklist

- [ ] All environment variables set in Railway
- [ ] `NODE_ENV=production`
- [ ] Strong `JWT_SECRET` (32+ characters, random)
- [ ] Gmail App Password configured correctly
- [ ] `FRONTEND_URL` set to production frontend URL
- [ ] MongoDB connection string configured
- [ ] CORS origins updated for production
- [ ] Health check endpoint working
- [ ] API documentation accessible
- [ ] Test registration flow
- [ ] Test email sending
- [ ] Test WebSocket connection

## Monitoring

Railway provides:
- **Logs**: Real-time application logs
- **Metrics**: CPU, memory, network usage
- **Deployments**: Deployment history and status

Monitor these regularly to catch issues early.

## Security Notes

1. **Never commit `.env` files** to Git
2. **Use strong JWT secrets** in production
3. **Limit CORS origins** to known frontend URLs
4. **Use App Passwords** for Gmail, not regular passwords
5. **Keep dependencies updated** for security patches

