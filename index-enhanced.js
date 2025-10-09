const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'https://copyright-mu.vercel.app',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enhanced logging middleware
app.use(morgan('combined'));
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  console.log(`🔍 Headers:`, req.headers);
  console.log(`📦 Body:`, req.body);
  next();
});

// Simple test endpoint
app.get('/test', (req, res) => {
  console.log('✅ Test endpoint called');
  res.json({ message: 'Backend is working!', timestamp: new Date().toISOString() });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('✅ Health check endpoint called');
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  console.log('🔐 Login attempt:', req.body);
  const { email, password } = req.body;
  
  if (email === 'admin@dsp.com' && password === 'admin123') {
    console.log('✅ Admin login successful');
    res.json({
      success: true,
      token: 'mock-jwt-token-' + Date.now(),
      user: {
        id: 'admin-1',
        email: 'admin@dsp.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        department: 'management'
      }
    });
  } else {
    console.log('❌ Login failed:', { email, password: password ? '[REDACTED]' : 'undefined' });
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

app.get('/api/auth/me', (req, res) => {
  console.log('👤 Auth check endpoint called');
  const authHeader = req.headers.authorization;
  console.log('🔑 Auth header:', authHeader);
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    res.json({
      id: 'admin-1',
      email: 'admin@dsp.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      department: 'management'
    });
  } else {
    res.status(401).json({ message: 'No token provided' });
  }
});

// Incidents endpoints
app.get('/api/incidents', (req, res) => {
  console.log('📋 Incidents list requested');
  res.json({
    incidents: [],
    total: 0,
    message: 'No incidents found'
  });
});

app.post('/api/incidents', (req, res) => {
  console.log('➕ New incident creation:', req.body);
  const incident = {
    id: 'incident-' + Date.now(),
    ...req.body,
    status: 'reported',
    createdAt: new Date().toISOString()
  };
  res.json({ incident });
});

app.get('/api/incidents/:id', (req, res) => {
  console.log('🔍 Incident detail requested:', req.params.id);
  res.json({
    id: req.params.id,
    title: 'Sample Incident',
    description: 'This is a sample incident',
    status: 'reported',
    createdAt: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error occurred:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler with detailed logging
app.use('*', (req, res) => {
  console.log('❌ Route not found:', req.method, req.originalUrl);
  console.log('🔍 Available routes: /test, /api/health, /api/auth/login, /api/auth/me, /api/incidents');
  res.status(404).json({ 
    message: 'Route not found',
    method: req.method,
    path: req.originalUrl,
    availableRoutes: ['/test', '/api/health', '/api/auth/login', '/api/auth/me', '/api/incidents']
  });
});

console.log('🚀 Enhanced backend initialized with logging');
console.log('📊 Environment:', process.env.NODE_ENV || 'development');
console.log('🌐 Client URL:', process.env.CLIENT_URL || 'not set');

module.exports = app;

