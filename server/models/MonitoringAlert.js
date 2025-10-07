const mongoose = require('mongoose');

const monitoringAlertSchema = new mongoose.Schema({
  // Alert Information
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  
  // Source Information
  source: {
    type: String,
    enum: ['google_alerts', 'brandmentions', 'automated_scan', 'manual', 'other'],
    required: true
  },
  sourceUrl: String,
  sourceDomain: String,
  
  // Content Information
  detectedContent: {
    type: String,
    required: true
  },
  matchedKeywords: [String],
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  
  // DSP Content Information
  dspContent: {
    title: String,
    author: String,
    isbn: String,
    publicationDate: Date,
    contentType: {
      type: String,
      enum: ['book', 'video', 'software', 'website', 'other']
    }
  },
  
  // Alert Status
  status: {
    type: String,
    enum: ['new', 'reviewed', 'investigating', 'action_taken', 'resolved', 'false_positive'],
    default: 'new'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // Assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Related Records
  incidentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident'
  },
  
  // Evidence
  screenshots: [String],
  evidenceUrls: [String],
  
  // Actions Taken
  actions: [{
    actionType: {
      type: String,
      enum: ['investigate', 'create_incident', 'send_cease_desist', 'dmca_takedown', 'abuse_report', 'ignore']
    },
    description: String,
    takenBy: mongoose.Schema.Types.ObjectId,
    takenAt: { type: Date, default: Date.now },
    result: String
  }],
  
  // Monitoring Configuration
  monitoringConfig: {
    keywords: [String],
    domains: [String],
    frequency: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'monthly'],
      default: 'daily'
    },
    enabled: { type: Boolean, default: true }
  },
  
  // Timestamps
  detectedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: Date,
  resolvedAt: Date,
  
  // Additional Information
  notes: [{
    content: String,
    author: mongoose.Schema.Types.ObjectId,
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Metadata
  metadata: {
    language: String,
    country: String,
    platform: String,
    contentType: String
  }
}, {
  timestamps: true
});

// Indexes
monitoringAlertSchema.index({ status: 1, detectedAt: -1 });
monitoringAlertSchema.index({ source: 1 });
monitoringAlertSchema.index({ assignedTo: 1 });
monitoringAlertSchema.index({ 'matchedKeywords': 1 });
monitoringAlertSchema.index({ confidence: -1 });

// Pre-save middleware
monitoringAlertSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'reviewed' && !this.reviewedAt) {
      this.reviewedAt = new Date();
    }
    if (this.status === 'resolved' && !this.resolvedAt) {
      this.resolvedAt = new Date();
    }
  }
  next();
});

// Method to add action
monitoringAlertSchema.methods.addAction = function(actionType, description, takenBy) {
  this.actions.push({
    actionType,
    description,
    takenBy,
    takenAt: new Date()
  });
  return this.save();
};

// Method to update status
monitoringAlertSchema.methods.updateStatus = function(newStatus, userId) {
  this.status = newStatus;
  
  if (newStatus === 'reviewed' && !this.reviewedBy) {
    this.reviewedBy = userId;
  }
  
  return this.save();
};

// Method to create incident from alert
monitoringAlertSchema.methods.createIncident = function(userId) {
  const incidentData = {
    title: this.title,
    description: this.description,
    reporter: userId,
    incidentType: 'copyright_infringement',
    infringedContent: this.dspContent.title || 'Unknown DSP Content',
    infringedUrls: [{
      url: this.sourceUrl,
      description: this.description,
      verified: true
    }],
    monitoringSource: this.source,
    evidence: this.screenshots.map(screenshot => ({
      type: 'screenshot',
      filename: screenshot,
      description: 'Screenshot from monitoring alert'
    }))
  };
  
  this.incidentId = mongoose.Types.ObjectId();
  this.status = 'action_taken';
  
  return this.save();
};

// Static method to get alerts by status
monitoringAlertSchema.statics.getByStatus = function(status) {
  return this.find({ status }).sort({ detectedAt: -1 });
};

// Static method to get high priority alerts
monitoringAlertSchema.statics.getHighPriority = function() {
  return this.find({ 
    priority: { $in: ['high', 'critical'] },
    status: { $nin: ['resolved', 'false_positive'] }
  }).sort({ detectedAt: -1 });
};

module.exports = mongoose.model('MonitoringAlert', monitoringAlertSchema);
