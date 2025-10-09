#!/bin/bash

# DSP Brand Protection Platform - Vercel Deployment Script
# This script helps deploy the application to Vercel

echo "🚀 DSP Brand Protection Platform - Vercel Deployment"
echo "=================================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Installing now..."
    npm install -g vercel
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please log in to Vercel:"
    vercel login
fi

echo "📦 Installing dependencies..."
npm run install-all

echo "🏗️  Building client..."
cd client && npm run build && cd ..

echo "🚀 Deploying to Vercel..."
vercel

echo "✅ Deployment initiated!"
echo ""
echo "📋 Next steps:"
echo "1. Go to your Vercel dashboard"
echo "2. Add environment variables (see vercel-env-template.txt)"
echo "3. Redeploy with: vercel --prod"
echo ""
echo "🔧 Required Environment Variables:"
echo "- DATABASE_TYPE=supabase"
echo "- NEXT_PUBLIC_SUPABASE_URL=https://slccdyjixpmstlhveagk.supabase.co"
echo "- NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsY2NkeWppeHBtc3RsaHZlYWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODc0MjEsImV4cCI6MjA3NTM2MzQyMX0.6H9CVWzYybK3mJNHeo-B2T-pYqBeBg40UVT8lfQ_Ev4"
echo "- JWT_SECRET=your-super-secret-jwt-key-change-this-in-production"
echo "- JWT_EXPIRES_IN=7d"
echo "- CLIENT_URL=https://your-app-name.vercel.app"
echo "- NODE_ENV=production"

