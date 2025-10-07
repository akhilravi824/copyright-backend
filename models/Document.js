const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  // Document Information
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['cease_desist', 'dmca_takedown', 'abuse_report', 'legal_notice', 'template', 'other'],
    required: true
  },
  
  // Content
  content: {
    type: String,
    required: true
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template'
  },
  
  // Related Information
  incidentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Document Status
  status: {
    type: String,
    enum: ['draft', 'review', 'approved', 'sent', 'responded', 'archived'],
    default: 'draft'
  },
  
  // Delivery Information
  deliveryMethod: {
    type: String,
    enum: ['email', 'mail', 'fax', 'online_form', 'other']
  },
  sentDate: Date,
  responseDate: Date,
  responseContent: String,
  
  // Recipient Information
  recipient: {
    name: String,
    email: String,
    address: String,
    organization: String
  },
  
  // File Information
  filePath: String,
  fileName: String,
  fileSize: Number,
  mimeType: String,
  
  // Version Control
  version: {
    type: Number,
    default: 1
  },
  previousVersions: [{
    content: String,
    version: Number,
    modifiedBy: mongoose.Schema.Types.ObjectId,
    modifiedAt: Date
  }],
  
  // Review Process
  reviewers: [{
    user: mongoose.Schema.Types.ObjectId,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected']
    },
    comments: String,
    reviewedAt: Date
  }],
  
  // Additional Fields
  tags: [String],
  notes: [{
    content: String,
    author: mongoose.Schema.Types.ObjectId,
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Legal Compliance
  legalReview: {
    required: { type: Boolean, default: false },
    reviewedBy: mongoose.Schema.Types.ObjectId,
    reviewedAt: Date,
    approved: Boolean,
    comments: String
  },
  
  // Tracking
  views: [{
    user: mongoose.Schema.Types.ObjectId,
    viewedAt: { type: Date, default: Date.now }
  }],
  
  // Metadata
  metadata: {
    wordCount: Number,
    pageCount: Number,
    language: { type: String, default: 'en' }
  }
}, {
  timestamps: true
});

// Indexes
documentSchema.index({ incidentId: 1 });
documentSchema.index({ createdBy: 1 });
documentSchema.index({ type: 1 });
documentSchema.index({ status: 1 });
documentSchema.index({ sentDate: -1 });

// Pre-save middleware
documentSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    this.metadata.wordCount = this.content.split(/\s+/).length;
    this.version += 1;
  }
  next();
});

// Method to add reviewer
documentSchema.methods.addReviewer = function(userId) {
  const existingReviewer = this.reviewers.find(r => r.user.toString() === userId.toString());
  if (!existingReviewer) {
    this.reviewers.push({
      user: userId,
      status: 'pending'
    });
  }
  return this.save();
};

// Method to update reviewer status
documentSchema.methods.updateReviewerStatus = function(userId, status, comments = '') {
  const reviewer = this.reviewers.find(r => r.user.toString() === userId.toString());
  if (reviewer) {
    reviewer.status = status;
    reviewer.comments = comments;
    reviewer.reviewedAt = new Date();
  }
  return this.save();
};

// Method to check if all reviews are complete
documentSchema.methods.areAllReviewsComplete = function() {
  return this.reviewers.every(r => r.status !== 'pending');
};

// Method to generate document number
documentSchema.methods.generateDocumentNumber = function() {
  const prefix = this.type.toUpperCase().replace('_', '-');
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `${prefix}-${date}-${random}`;
};

module.exports = mongoose.model('Document', documentSchema);
