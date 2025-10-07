const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dsp-brand-protection', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`📊 MongoDB Connected: ${conn.connection.host}`);
    
    // Create indexes for better performance
    await createIndexes();
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    // Create compound indexes for common queries
    const db = mongoose.connection.db;
    
    // Incident indexes
    await db.collection('incidents').createIndex({ status: 1, reportedAt: -1 });
    await db.collection('incidents').createIndex({ reporter: 1, status: 1 });
    await db.collection('incidents').createIndex({ assignedTo: 1, status: 1 });
    
    // User indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1, department: 1 });
    
    // Document indexes
    await db.collection('documents').createIndex({ incidentId: 1, status: 1 });
    await db.collection('documents').createIndex({ createdBy: 1, createdAt: -1 });
    
    // Monitoring alert indexes
    await db.collection('monitoringalerts').createIndex({ status: 1, detectedAt: -1 });
    await db.collection('monitoringalerts').createIndex({ source: 1, confidence: -1 });
    
    console.log('✅ Database indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error.message);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('📊 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error closing database connection:', error.message);
    process.exit(1);
  }
});

module.exports = connectDB;
