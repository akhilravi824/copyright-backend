const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const router = express.Router();

const databaseService = require('../config/databaseService');
const { auth, requireRole } = require('../middleware/auth-supabase');

const mapUserToClient = (u) => ({
  _id: u.id,
  firstName: u.first_name,
  lastName: u.last_name,
  email: u.email,
  role: u.role,
  department: u.department,
  phone: u.phone,
  jobTitle: u.job_title,
  isActive: u.is_active,
  lockUntil: u.lock_until,
  lastLogin: u.last_login,
  invitationStatus: u.invitation_status,
  invitationExpires: u.invitation_expires,
  createdAt: u.created_at,
  updatedAt: u.updated_at,
});

// GET /api/users
router.get('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const db = databaseService.getService();
    const client = db.client;

    const { page = 1, limit = 10, search = '', department = '', role = '', status = '' } = req.query;

    let query = client.from('users').select('*', { count: 'exact' });

    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,job_title.ilike.%${search}%`
      );
    }
    if (department) query = query.eq('department', department);
    if (role) query = query.eq('role', role);
    if (status === 'active') query = query.eq('is_active', true);
    if (status === 'inactive') query = query.eq('is_active', false);

    const from = (parseInt(page) - 1) * parseInt(limit);
    const to = from + parseInt(limit) - 1;

    const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
    if (error) throw error;

    const users = (data || []).map(mapUserToClient);
    const total = count || 0;

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users (supabase):', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/users/:id
router.get('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const client = databaseService.getService().client;
    const { data, error } = await client.from('users').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'User not found' });
    res.json(mapUserToClient(data));
  } catch (error) {
    console.error('Error fetching user (supabase):', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/users/:id
router.put(
  '/:id',
  auth,
  requireRole('admin'),
  [
    body('firstName').optional().trim().isLength({ min: 2 }),
    body('lastName').optional().trim().isLength({ min: 2 }),
    body('email').optional().isEmail(),
    body('role').optional().isIn(['admin', 'legal', 'manager', 'staff', 'viewer']),
    body('department').optional().isIn(['legal', 'marketing', 'crr', 'management', 'it']),
    body('phone').optional().trim(),
    body('jobTitle').optional().trim(),
    body('isActive').optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const client = databaseService.getService().client;
      const updates = {};
      const map = {
        firstName: 'first_name',
        lastName: 'last_name',
        email: 'email',
        role: 'role',
        department: 'department',
        phone: 'phone',
        jobTitle: 'job_title',
        isActive: 'is_active',
      };
      Object.keys(map).forEach((k) => {
        if (typeof req.body[k] !== 'undefined') updates[map[k]] = req.body[k];
      });
      updates.updated_at = new Date();

      const { data, error } = await client
        .from('users')
        .update(updates)
        .eq('id', req.params.id)
        .select('*')
        .single();
      if (error) throw error;

      res.json({ message: 'User updated successfully', user: mapUserToClient(data) });
    } catch (error) {
      console.error('Error updating user (supabase):', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// PUT /api/users/:id/password
router.put(
  '/:id/password',
  auth,
  requireRole('admin'),
  [body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { newPassword } = req.body;
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(newPassword, salt);

      const client = databaseService.getService().client;
      const { error } = await client
        .from('users')
        .update({ password_hash, updated_at: new Date() })
        .eq('id', req.params.id);
      if (error) throw error;

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Error updating password (supabase):', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// PUT /api/users/:id/lock
router.put(
  '/:id/lock',
  auth,
  requireRole('admin'),
  [body('locked').isBoolean().withMessage('Locked status must be boolean')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { locked } = req.body;
      const client = databaseService.getService().client;
      const lock_until = locked ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;
      const login_attempts = locked ? 5 : 0;
      const { error } = await client
        .from('users')
        .update({ lock_until, login_attempts, updated_at: new Date() })
        .eq('id', req.params.id);
      if (error) throw error;

      res.json({ message: locked ? 'User account locked successfully' : 'User account unlocked successfully', locked });
    } catch (error) {
      console.error('Error updating user lock (supabase):', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// POST /api/users (invite)
router.post(
  '/',
  auth,
  requireRole('admin'),
  [
    body('firstName').trim().isLength({ min: 2 }),
    body('lastName').trim().isLength({ min: 2 }),
    body('email').isEmail(),
    body('role').isIn(['admin', 'legal', 'manager', 'staff', 'viewer']),
    body('department').isIn(['legal', 'marketing', 'crr', 'management', 'it']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const client = databaseService.getService().client;
      const { firstName, lastName, email, role, department, phone, jobTitle } = req.body;

      // Check existing
      const { data: existing, error: existErr } = await client.from('users').select('id').eq('email', email).maybeSingle();
      if (existErr) throw existErr;
      if (existing) return res.status(400).json({ message: 'User with this email already exists' });

      const invitation_token = crypto.randomBytes(24).toString('hex');
      const invitation_expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await client
        .from('users')
        .insert([
          {
            first_name: firstName,
            last_name: lastName,
            email,
            role,
            department,
            phone,
            job_title: jobTitle,
            is_active: false,
            invitation_status: 'pending',
            invitation_token,
            invitation_expires,
            email_verified: false,
          },
        ])
        .select('*')
        .single();
      if (error) throw error;

      // TODO: integrate email service here if configured

      res.status(201).json({ message: 'User invitation created', user: mapUserToClient(data) });
    } catch (error) {
      console.error('Error creating user (supabase):', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// DELETE /api/users/:id (soft delete)
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const client = databaseService.getService().client;
    const { error } = await client
      .from('users')
      .update({ is_active: false, updated_at: new Date() })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating user (supabase):', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/users/stats/overview
router.get('/stats/overview', auth, requireRole('admin'), async (req, res) => {
  try {
    const client = databaseService.getService().client;

    const totalRes = await client.from('users').select('id', { count: 'exact', head: true });
    if (totalRes.error) throw totalRes.error;
    const activeRes = await client
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);
    if (activeRes.error) throw activeRes.error;
    const inactiveRes = await client
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', false);
    if (inactiveRes.error) throw inactiveRes.error;

    const byRole = await client
      .from('users')
      .select('role')
      .neq('role', null);
    if (byRole.error) throw byRole.error;
    const usersByRole = (byRole.data || []).reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {});
    const usersByRoleArr = Object.entries(usersByRole).map(([k, v]) => ({ _id: k, count: v }));

    const byDept = await client
      .from('users')
      .select('department')
      .neq('department', null);
    if (byDept.error) throw byDept.error;
    const usersByDepartment = (byDept.data || []).reduce((acc, u) => {
      acc[u.department] = (acc[u.department] || 0) + 1;
      return acc;
    }, {});
    const usersByDepartmentArr = Object.entries(usersByDepartment).map(([k, v]) => ({ _id: k, count: v }));

    const recent = await client
      .from('users')
      .select('first_name,last_name,email,role,department,created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    if (recent.error) throw recent.error;

    res.json({
      totalUsers: totalRes.count || 0,
      activeUsers: activeRes.count || 0,
      inactiveUsers: inactiveRes.count || 0,
      usersByRole: usersByRoleArr,
      usersByDepartment: usersByDepartmentArr,
      recentUsers: (recent.data || []).map((u) => ({
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        role: u.role,
        department: u.department,
        createdAt: u.created_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching user stats (supabase):', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Invitation endpoints (public)
router.get('/invitation/:token', async (req, res) => {
  try {
    const client = databaseService.getService().client;
    const { data, error } = await client
      .from('users')
      .select('*')
      .eq('invitation_token', req.params.token)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Invalid invitation token' });
    if (data.invitation_expires && new Date(data.invitation_expires) < new Date()) {
      return res.status(400).json({ message: 'Invitation has expired or is no longer valid' });
    }
    res.json({
      user: {
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        role: data.role,
        department: data.department,
        jobTitle: data.job_title,
      },
    });
  } catch (error) {
    console.error('Error fetching invitation (supabase):', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/invitation/:token/accept', [body('password').isLength({ min: 6 })], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const client = databaseService.getService().client;
    const { data: user, error } = await client
      .from('users')
      .select('*')
      .eq('invitation_token', req.params.token)
      .maybeSingle();
    if (error) throw error;
    if (!user) return res.status(404).json({ message: 'Invalid invitation token' });
    if (user.invitation_expires && new Date(user.invitation_expires) < new Date()) {
      return res.status(400).json({ message: 'Invitation has expired or is no longer valid' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(req.body.password, salt);

    const { error: updErr } = await client
      .from('users')
      .update({
        password_hash,
        is_active: true,
        email_verified: true,
        invitation_status: 'accepted',
        invitation_token: null,
        invitation_expires: null,
        updated_at: new Date(),
      })
      .eq('id', user.id);
    if (updErr) throw updErr;

    const jwt = require('jsonwebtoken');
    const tokenJwt = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Account created successfully',
      token: tokenJwt,
      user: {
        _id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        department: user.department,
        jobTitle: user.job_title,
      },
    });
  } catch (error) {
    console.error('Error accepting invitation (supabase):', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


