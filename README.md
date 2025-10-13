# DSP Brand Protection Platform - Backend API

This is the backend API for the DSP Brand Protection Platform, deployed separately on Vercel.

## 🚀 Deployment

This backend is deployed on Vercel as a serverless function.

## 🔧 Environment Variables

Required environment variables:
- `DATABASE_TYPE=supabase`
- `NEXT_PUBLIC_SUPABASE_URL=https://slccdyjixpmstlhveagk.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsY2NkeWppeHBtc3RsaHZlYWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODc0MjEsImV4cCI6MjA3NTM2MzQyMX0.6H9CVWzYybK3mJNHeo-B2T-pYqBeBg40UVT8lfQ_Ev4`
- `JWT_SECRET=your-super-secret-jwt-key-change-this-in-production`
- `JWT_EXPIRES_IN=7d`
- `CLIENT_URL=https://your-frontend-url.vercel.app`
- `NODE_ENV=production`

## 📡 API Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user
- `GET /api/incidents` - List incidents
- `POST /api/incidents` - Create incident
- `GET /api/incidents/:id` - Get incident details
- And more...

## 🔗 Frontend Integration

The frontend should be configured to make API calls to this backend URL.


