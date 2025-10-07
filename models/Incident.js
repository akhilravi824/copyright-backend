const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Incident Details
  incidentType: {
    type: String,
    enum: ['copyright_infringement', 'trademark_violation', 'impersonation', 'unauthorized_distribution', 'other'],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['reported', 'under_review', 'in_progress', 'resolved', 'closed', 'escalated'],
    default: 'reported'
  },
  
  // Content Information
  infringedContent: {
    type: String,
    required: true
  },
  infringedUrls: [{
    url: String,
    description: String,
    screenshot: String,
    verified: { type: Boolean, default: false }
  }],
  
  // Infringer Information
  infringerInfo: {
    name: String,
    website: String,
    email: String,
    organization: String,
    contactInfo: String
  },
  
  // Legal Information
  legalActions: [{
    actionType: {
      type: String,
      enum: ['cease_desist', 'dmca_takedown', 'abuse_report', 'legal_notice', 'other']
    },
    documentId: mongoose.Schema.Types.ObjectId,
    sentDate: Date,
    responseDate: Date,
    status: {
      type: String,
      enum: ['draft', 'sent', 'responded', 'ignored', 'resolved']
    }
  }],
  
  // Evidence and Documentation
  evidence: [{
    type: {
      type: String,
      enum: ['screenshot', 'document', 'url', 'email', 'other']
    },
    filename: String,
    url: String,
    description: String,
    uploadedBy: mongoose.Schema.Types.ObjectId,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Case Management
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // Timestamps and Metadata
  reportedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  resolvedAt: Date,
  
  // Additional Fields
  tags: [String],
  notes: [{
    content: String,
    author: mongoose.Schema.Types.ObjectId,
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Monitoring Integration
  monitoringSource: {
    type: String,
    enum: ['manual', 'google_alerts', 'brandmentions', 'automated_scan', 'other']
  },
  
  // Resolution Information
  resolution: {
    outcome: {
      type: String,
      enum: ['content_removed', 'partial_resolution', 'no_action_taken', 'legal_action', 'ongoing']
    },
    notes: String,
    followUpRequired: { type: Boolean, default: false },
    followUpDate: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
incidentSchema.index({ status: 1, reportedAt: -1 });
incidentSchema.index({ reporter: 1 });
incidentSchema.index({ assignedTo: 1 });
incidentSchema.index({ incidentType: 1 });
incidentSchema.index({ severity: 1 });
incidentSchema.index({ 'infringedUrls.url': 1 });

// Pre-save middleware to update lastUpdated
incidentSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Virtual for case number
incidentSchema.virtual('caseNumber').get(function() {
  return `DSP-${this._id.toString().slice(-8).toUpperCase()}`;
});

// Method to add a note
incidentSchema.methods.addNote = function(content, authorId) {
  this.notes.push({
    content,
    author: authorId,
    createdAt: new Date()
  });
  return this.save();
};

// Method to update status
incidentSchema.methods.updateStatus = function(newStatus, userId) {
  this.status = newStatus;
  this.lastUpdated = new Date();
  
  if (newStatus === 'resolved' || newStatus === 'closed') {
    this.resolvedAt = new Date();
  }
  
  return this.save();
};

module.exports = mongoose.model('Incident', incidentSchema);
