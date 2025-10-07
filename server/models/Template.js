const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  // Template Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['cease_desist', 'dmca_takedown', 'abuse_report', 'legal_notice', 'email_template', 'other'],
    required: true
  },
  
  // Content
  subject: String,
  content: {
    type: String,
    required: true
  },
  
  // Template Variables
  variables: [{
    name: String,
    label: String,
    type: {
      type: String,
      enum: ['text', 'textarea', 'date', 'email', 'url', 'select'],
      default: 'text'
    },
    required: { type: Boolean, default: false },
    options: [String], // For select type
    defaultValue: String,
    description: String
  }],
  
  // Metadata
  description: String,
  category: String,
  tags: [String],
  
  // Version Control
  version: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Access Control
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Usage Tracking
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsed: Date,
  
  // Legal Compliance
  legalApproved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  
  // Template Settings
  settings: {
    requireApproval: { type: Boolean, default: true },
    allowCustomization: { type: Boolean, default: true },
    autoSave: { type: Boolean, default: true }
  },
  
  // History
  history: [{
    version: Number,
    content: String,
    modifiedBy: mongoose.Schema.Types.ObjectId,
    modifiedAt: { type: Date, default: Date.now },
    changeNotes: String
  }]
}, {
  timestamps: true
});

// Indexes
templateSchema.index({ type: 1 });
templateSchema.index({ isActive: 1 });
templateSchema.index({ createdBy: 1 });

// Pre-save middleware
templateSchema.pre('save', function(next) {
  if (this.isModified('content') || this.isModified('subject')) {
    this.version += 1;
    this.history.push({
      version: this.version - 1,
      content: this.content,
      subject: this.subject,
      modifiedBy: this.lastModifiedBy,
      modifiedAt: new Date()
    });
  }
  next();
});

// Method to increment usage
templateSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

// Method to render template with variables
templateSchema.methods.render = function(variables = {}) {
  let renderedContent = this.content;
  let renderedSubject = this.subject || '';
  
  // Replace variables in content
  this.variables.forEach(variable => {
    const value = variables[variable.name] || variable.defaultValue || '';
    const regex = new RegExp(`{{${variable.name}}}`, 'g');
    renderedContent = renderedContent.replace(regex, value);
    renderedSubject = renderedSubject.replace(regex, value);
  });
  
  return {
    subject: renderedSubject,
    content: renderedContent
  };
};

// Method to validate required variables
templateSchema.methods.validateVariables = function(variables = {}) {
  const missing = [];
  
  this.variables.forEach(variable => {
    if (variable.required && (!variables[variable.name] || variables[variable.name].trim() === '')) {
      missing.push(variable.name);
    }
  });
  
  return {
    isValid: missing.length === 0,
    missingVariables: missing
  };
};

// Static method to get templates by type
templateSchema.statics.getByType = function(type) {
  return this.find({ type, isActive: true }).sort({ name: 1 });
};

// Static method to get most used templates
templateSchema.statics.getMostUsed = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ usageCount: -1 })
    .limit(limit);
};

module.exports = mongoose.model('Template', templateSchema);
