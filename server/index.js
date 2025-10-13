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
if (process.env.DATABASE_TYPE === 'supabase') {
  app.use('/api/auth', require('./routes/auth-supabase')); // Use Supabase auth routes
  app.use('/api/incidents', require('./routes/incidents-supabase')); // Use Supabase incident routes
  // Add other Supabase routes as they are converted
  app.use('/api/users', require('./routes/users-supabase'));
  app.use('/api/chat', require('./routes/chat')); // Chat routes (Supabase only)
} else {
  app.use('/api/auth', require('./routes/auth')); // Original MongoDB auth routes
  app.use('/api/incidents', require('./routes/incidents')); // Original MongoDB incident routes
  app.use('/api/users', require('./routes/users'));
}
app.use('/api/cases', require('./routes/cases'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/monitoring', require('./routes/monitoring'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/templates', require('./routes/templates'));

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

// Start server
const startServer = async () => {
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
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 DSP Brand Protection API running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Database: ${process.env.DATABASE_TYPE || 'mongodb'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
