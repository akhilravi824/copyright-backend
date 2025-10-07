#!/bin/bash

echo "🧪 Testing DSP Brand Protection Platform"
echo "========================================"

# Test MongoDB connection
echo "📊 Testing MongoDB connection..."
mongosh --eval "db.runCommand('ping')" dsp-brand-protection > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ MongoDB is running and accessible"
else
    echo "❌ MongoDB connection failed"
    echo "   Make sure MongoDB is running: brew services start mongodb/brew/mongodb-community"
fi

# Test backend API
echo ""
echo "🔧 Testing Backend API..."
response=$(curl -s -w "%{http_code}" http://localhost:5000/api/health -o /dev/null)
if [ "$response" = "200" ]; then
    echo "✅ Backend API is responding"
else
    echo "❌ Backend API not responding (HTTP $response)"
    echo "   Make sure the server is running: npm run dev"
fi

# Test frontend
echo ""
echo "🌐 Testing Frontend..."
response=$(curl -s -w "%{http_code}" http://localhost:3000 -o /dev/null)
if [ "$response" = "200" ]; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend not accessible (HTTP $response)"
    echo "   Make sure the React app is running"
fi

echo ""
echo "🎯 Quick Test Summary:"
echo "======================"
echo "Backend API: http://localhost:5000"
echo "Frontend:    http://localhost:3000"
echo ""
echo "📋 Manual Testing Steps:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. You should see the DSP Brand Protection login page"
echo "3. Create an admin user via API or database"
echo "4. Login and test the dashboard"
echo ""
echo "🔧 API Testing Commands:"
echo "curl http://localhost:5000/api/health"
echo "curl -X POST http://localhost:5000/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"admin@dsp.com\",\"password\":\"password123\"}'"
echo ""
echo "✨ Happy Testing!"
