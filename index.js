const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const databaseService = require('./config/databaseService');

const app = express();
const PORT = process.env.PORT || 5001;

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
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

// Routes
console.log('Setting up routes...');
console.log('DATABASE_TYPE:', process.env.DATABASE_TYPE);

try {
  if (process.env.DATABASE_TYPE === 'supabase') {
    console.log('Using Supabase routes');
    app.use('/api/auth', require('./routes/auth-supabase')); // Use Supabase auth routes
    app.use('/api/incidents', require('./routes/incidents-supabase')); // Use Supabase incident routes
    // Add other Supabase routes as they are converted
    app.use('/api/users', require('./routes/users-supabase'));
  } else {
    console.log('Using MongoDB routes');
    app.use('/api/auth', require('./routes/auth')); // Original MongoDB auth routes
    app.use('/api/incidents', require('./routes/incidents')); // Original MongoDB incident routes
    app.use('/api/users', require('./routes/users'));
  }
} catch (error) {
  console.error('Error setting up routes:', error);
}
app.use('/api/cases', require('./routes/cases'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/monitoring', require('./routes/monitoring'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/templates', require('./routes/templates'));

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Backend is working!', timestamp: new Date().toISOString() });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Initialize database connection
const initializeDatabase = async () => {
  try {
    // Connect to database
    await databaseService.connect();
    
    // Create database indexes if using MongoDB
    if (process.env.DATABASE_TYPE !== 'supabase') {
      const mongoose = require('mongoose');
      const User = require('./models/User');
      const Incident = require('./models/Incident');
      
      await User.createIndexes();
      await Incident.createIndexes();
      console.log('✅ Database indexes created successfully');
    }
    
    console.log(`🚀 DSP Brand Protection API initialized`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  Database: ${process.env.DATABASE_TYPE || 'mongodb'}`);
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    // Don't exit process on Vercel
  }
};

// Initialize database on startup
initializeDatabase();

module.exports = app;
