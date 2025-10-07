const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Information
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    minlength: 6
  },
  
  // Role and Permissions
  role: {
    type: String,
    enum: ['admin', 'legal', 'manager', 'staff', 'viewer'],
    default: 'staff'
  },
  department: {
    type: String,
    enum: ['legal', 'marketing', 'crr', 'management', 'it'],
    required: true
  },
  
  // Profile Information
  phone: String,
  jobTitle: String,
  avatar: String,
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  
  // Preferences
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    dashboardLayout: { type: String, default: 'default' },
    timezone: { type: String, default: 'America/Los_Angeles' }
  },
  
  // Security
  passwordResetToken: String,
  passwordResetExpires: Date,
  emailVerificationToken: String,
  emailVerified: { type: Boolean, default: false },
  
  // Invitation System
  invitationToken: String,
  invitationExpires: Date,
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  invitationStatus: {
    type: String,
    enum: ['pending', 'accepted', 'expired'],
    default: 'pending'
  },
  
  // Activity Tracking
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date
}, {
  timestamps: true
});

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ department: 1 });
userSchema.index({ invitationToken: 1 });
userSchema.index({ invitationStatus: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for account locked status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLogin: new Date() }
  });
};

// Method to check if user can perform action
userSchema.methods.canPerformAction = function(action) {
  const permissions = {
    admin: ['*'],
    legal: ['view_incidents', 'edit_incidents', 'create_documents', 'send_legal_actions', 'view_reports'],
    manager: ['view_incidents', 'edit_incidents', 'assign_cases', 'view_reports'],
    staff: ['view_incidents', 'create_incidents', 'edit_own_incidents'],
    viewer: ['view_incidents']
  };
  
  const userPermissions = permissions[this.role] || [];
  return userPermissions.includes('*') || userPermissions.includes(action);
};

// Method to generate invitation token
userSchema.methods.generateInvitationToken = function() {
  const crypto = require('crypto');
  this.invitationToken = crypto.randomBytes(32).toString('hex');
  this.invitationExpires = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  this.invitationStatus = 'pending';
  return this.invitationToken;
};

// Method to check if invitation is valid
userSchema.methods.isInvitationValid = function() {
  return this.invitationStatus === 'pending' && 
         this.invitationExpires && 
         this.invitationExpires > Date.now();
};

// Method to accept invitation
userSchema.methods.acceptInvitation = function(password) {
  if (!this.isInvitationValid()) {
    throw new Error('Invalid or expired invitation');
  }
  
  this.password = password;
  this.invitationStatus = 'accepted';
  this.invitationToken = undefined;
  this.invitationExpires = undefined;
  this.emailVerified = true;
  this.isActive = true;
  
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
