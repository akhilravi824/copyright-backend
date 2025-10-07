const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
const emailService = require('../services/emailService');

// Get all users (Admin only)
router.get('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', department = '', role = '', status = '' } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { jobTitle: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (department) {
      filter.department = department;
    }
    
    if (role) {
      filter.role = role;
    }
    
    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const users = await User.find(filter)
      .select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await User.countDocuments(filter);
    
    res.json({
      users,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user by ID
router.get('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user profile
router.put('/:id', auth, requireRole('admin'), [
  body('firstName').optional().trim().isLength({ min: 2 }),
  body('lastName').optional().trim().isLength({ min: 2 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('role').optional().isIn(['admin', 'legal', 'manager', 'staff', 'viewer']),
  body('department').optional().isIn(['legal', 'marketing', 'crr', 'management', 'it']),
  body('phone').optional().trim(),
  body('jobTitle').optional().trim(),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { firstName, lastName, email, role, department, phone, jobTitle, isActive, preferences } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }
    
    // Update user fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (role) user.role = role;
    if (department) user.department = department;
    if (phone) user.phone = phone;
    if (jobTitle) user.jobTitle = jobTitle;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (preferences) {
      user.preferences = { ...user.preferences, ...preferences };
    }
    
    await user.save();
    
    // Return user without sensitive data
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.passwordResetToken;
    delete userResponse.passwordResetExpires;
    delete userResponse.emailVerificationToken;
    
    res.json({
      message: 'User updated successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Change user password
router.put('/:id/password', auth, requireRole('admin'), [
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { newPassword } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.password = newPassword; // Pre-save hook will hash it
    await user.save();
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Lock/Unlock user account
router.put('/:id/lock', auth, requireRole('admin'), [
  body('locked').isBoolean().withMessage('Locked status must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { locked } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (locked) {
      // Lock the account for 24 hours
      user.lockUntil = Date.now() + 24 * 60 * 60 * 1000;
      user.loginAttempts = 5;
    } else {
      // Unlock the account
      user.lockUntil = undefined;
      user.loginAttempts = 0;
    }
    
    await user.save();
    
    res.json({
      message: locked ? 'User account locked successfully' : 'User account unlocked successfully',
      locked: !!user.lockUntil
    });
  } catch (error) {
    console.error('Error updating user lock status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new user (Admin only) - Invitation-based
router.post('/', auth, requireRole('admin'), [
  body('firstName').trim().isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
  body('lastName').trim().isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('role').isIn(['admin', 'legal', 'manager', 'staff', 'viewer']).withMessage('Invalid role'),
  body('department').isIn(['legal', 'marketing', 'crr', 'management', 'it']).withMessage('Invalid department'),
  body('phone').optional().trim(),
  body('jobTitle').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { firstName, lastName, email, role, department, phone, jobTitle, preferences } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    const user = new User({
      firstName,
      lastName,
      email,
      role,
      department,
      phone,
      jobTitle,
      preferences: preferences || {
        emailNotifications: true,
        dashboardLayout: 'default',
        timezone: 'America/Los_Angeles'
      },
      isActive: false, // User will be activated after accepting invitation
      invitedBy: req.user._id
    });
    
    // Generate invitation token
    const invitationToken = user.generateInvitationToken();
    await user.save();
    
    // Send invitation email
    try {
      await emailService.sendInvitationEmail(user, invitationToken);
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Don't fail the request if email fails, just log it
    }
    
    // Return user without sensitive data
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.passwordResetToken;
    delete userResponse.passwordResetExpires;
    delete userResponse.emailVerificationToken;
    delete userResponse.invitationToken;
    
    res.status(201).json({
      message: 'User invitation sent successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Error creating user invitation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Resend invitation (Admin only)
router.post('/:id/resend-invitation', auth, requireRole('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.invitationStatus === 'accepted') {
      return res.status(400).json({ message: 'User has already accepted the invitation' });
    }
    
    // Generate new invitation token
    const invitationToken = user.generateInvitationToken();
    await user.save();
    
    // Send invitation email
    try {
      await emailService.sendInvitationEmail(user, invitationToken);
    } catch (emailError) {
      console.error('Failed to resend invitation email:', emailError);
      return res.status(500).json({ message: 'Failed to send invitation email' });
    }
    
    res.json({ message: 'Invitation resent successfully' });
  } catch (error) {
    console.error('Error resending invitation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete user (soft delete by deactivating)
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    
    // Soft delete by deactivating
    user.isActive = false;
    await user.save();
    
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user statistics
router.get('/stats/overview', auth, requireRole('admin'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });
    
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const usersByDepartment = await User.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const recentUsers = await User.find({ isActive: true })
      .select('firstName lastName email role department createdAt')
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.json({
      totalUsers,
      activeUsers,
      inactiveUsers,
      usersByRole,
      usersByDepartment,
      recentUsers
    });
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get invitation details (Public endpoint for registration)
router.get('/invitation/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const user = await User.findOne({ invitationToken: token })
      .populate('invitedBy', 'firstName lastName email')
      .select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken');
    
    if (!user) {
      return res.status(404).json({ message: 'Invalid invitation token' });
    }
    
    if (!user.isInvitationValid()) {
      return res.status(400).json({ message: 'Invitation has expired or is no longer valid' });
    }
    
    res.json({
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        department: user.department,
        jobTitle: user.jobTitle,
        invitedBy: user.invitedBy
      }
    });
  } catch (error) {
    console.error('Error fetching invitation details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Accept invitation and set password (Public endpoint for registration)
router.post('/invitation/:token/accept', [
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { token } = req.params;
    const { password } = req.body;
    
    const user = await User.findOne({ invitationToken: token });
    
    if (!user) {
      return res.status(404).json({ message: 'Invalid invitation token' });
    }
    
    if (!user.isInvitationValid()) {
      return res.status(400).json({ message: 'Invitation has expired or is no longer valid' });
    }
    
    // Accept the invitation
    await user.acceptInvitation(password);
    
    // Generate JWT token for immediate login
    const jwt = require('jsonwebtoken');
    const token_jwt = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '7d' }
    );
    
    res.json({
      message: 'Account created successfully',
      token: token_jwt,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        department: user.department,
        jobTitle: user.jobTitle
      }
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
