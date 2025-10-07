# DSP Brand Protection Platform - Vercel Deployment

This guide will help you deploy your DSP Brand Protection Platform to Vercel.

## 🚀 Quick Start

### Option 1: Use the Deployment Script
```bash
./deploy.sh
```

### Option 2: Manual Deployment
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Install dependencies
npm run install-all

# Build client
cd client && npm run build && cd ..

# Deploy
vercel
```

## 📋 Environment Variables Setup

After your first deployment, you **MUST** add these environment variables in your Vercel dashboard:

### Required Variables:
```
DATABASE_TYPE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://slccdyjixpmstlhveagk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsY2NkeWppeHBtc3RsaHZlYWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODc0MjEsImV4cCI6MjA3NTM2MzQyMX0.6H9CVWzYybK3mJNHeo-B2T-pYqBeBg40UVT8lfQ_Ev4
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
CLIENT_URL=https://your-app-name.vercel.app
NODE_ENV=production
```

### Optional Variables (for email notifications):
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com
```

## 🔧 How to Add Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable with its value
5. Click **Save**
6. Redeploy: `vercel --prod`

## 📁 Project Structure

```
├── client/          # React frontend
├── server/          # Node.js backend
├── vercel.json      # Vercel configuration
├── deploy.sh        # Deployment script
└── DEPLOYMENT.md    # Detailed deployment guide
```

## 🌐 API Endpoints

Your deployed API will be available at:
- `https://your-app-name.vercel.app/api/auth/*`
- `https://your-app-name.vercel.app/api/incidents/*`
- `https://your-app-name.vercel.app/api/users/*`
- `https://your-app-name.vercel.app/api/cases/*`
- `https://your-app-name.vercel.app/api/documents/*`
- `https://your-app-name.vercel.app/api/monitoring/*`
- `https://your-app-name.vercel.app/api/reports/*`
- `https://your-app-name.vercel.app/api/templates/*`

## 🔍 Troubleshooting

### Build Errors
- Ensure all dependencies are installed: `npm run install-all`
- Check Node.js version compatibility
- Verify all required files are present

### Environment Variables
- Double-check all variables are set correctly
- Ensure JWT_SECRET is a strong, unique value
- Update CLIENT_URL with your actual Vercel URL

### Database Connection
- Verify Supabase credentials are correct
- Check if DATABASE_TYPE is set to 'supabase'
- Test database connection in Supabase dashboard

### CORS Issues
- Update CLIENT_URL environment variable
- Ensure it matches your actual Vercel domain

## 📞 Support

If you encounter issues:
1. Check the Vercel deployment logs
2. Verify environment variables
3. Test API endpoints individually
4. Check Supabase connection

## 🎯 Post-Deployment Checklist

- [ ] Environment variables added
- [ ] Application accessible via Vercel URL
- [ ] API endpoints responding
- [ ] Database connection working
- [ ] User authentication flow tested
- [ ] File uploads working (if applicable)
- [ ] Email notifications working (if configured)

---

**Note**: Remember to update the `CLIENT_URL` environment variable with your actual Vercel URL after deployment!
