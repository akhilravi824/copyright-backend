# Vercel Deployment Guide for DSP Brand Protection Platform

## Prerequisites
1. Install Vercel CLI: `npm i -g vercel`
2. Have a Vercel account (sign up at vercel.com)
3. Ensure your project is in a Git repository

## Step 1: Install Vercel CLI and Login
```bash
npm i -g vercel
vercel login
```

## Step 2: Environment Variables Setup
Before deploying, you need to set up environment variables in Vercel:

### Required Environment Variables:
- `DATABASE_TYPE=supabase`
- `NEXT_PUBLIC_SUPABASE_URL=https://slccdyjixpmstlhveagk.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsY2NkeWppeHBtc3RsaHZlYWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODc0MjEsImV4cCI6MjA3NTM2MzQyMX0.6H9CVWzYybK3mJNHeo-B2T-pYqBeBg40UVT8lfQ_Ev4`
- `JWT_SECRET=your-super-secret-jwt-key-change-this-in-production`
- `JWT_EXPIRES_IN=7d`
- `CLIENT_URL=https://your-app-name.vercel.app` (update after deployment)
- `NODE_ENV=production`

### Optional Environment Variables (for email notifications):
- `EMAIL_HOST=smtp.gmail.com`
- `EMAIL_PORT=587`
- `EMAIL_USER=your-email@gmail.com`
- `EMAIL_PASS=your-app-password`
- `EMAIL_FROM=noreply@yourdomain.com`

## Step 3: Deploy to Vercel
```bash
# Navigate to your project root
cd /Users/akhilrkngmail.com/Desktop/copyright

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? (select your account)
# - Link to existing project? No
# - Project name: dsp-brand-protection-platform
# - Directory: ./
# - Override settings? No
```

## Step 4: Configure Environment Variables in Vercel Dashboard
1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings > Environment Variables
4. Add all the required environment variables listed above

## Step 5: Redeploy with Environment Variables
```bash
vercel --prod
```

## Project Structure
- **Frontend**: React app in `/client` directory
- **Backend**: Node.js/Express API in `/server` directory
- **Database**: Supabase PostgreSQL (configured)

## API Endpoints
Your API will be available at:
- `https://your-app-name.vercel.app/api/auth/*`
- `https://your-app-name.vercel.app/api/incidents/*`
- `https://your-app-name.vercel.app/api/users/*`
- `https://your-app-name.vercel.app/api/cases/*`
- `https://your-app-name.vercel.app/api/documents/*`
- `https://your-app-name.vercel.app/api/monitoring/*`
- `https://your-app-name.vercel.app/api/reports/*`
- `https://your-app-name.vercel.app/api/templates/*`

## Troubleshooting
1. **Build Errors**: Check that all dependencies are installed
2. **Environment Variables**: Ensure all required variables are set in Vercel dashboard
3. **Database Connection**: Verify Supabase credentials are correct
4. **CORS Issues**: Update CLIENT_URL environment variable with your actual Vercel URL

## Post-Deployment
1. Update the `CLIENT_URL` environment variable with your actual Vercel URL
2. Test all API endpoints
3. Verify database connections
4. Test user authentication flow
