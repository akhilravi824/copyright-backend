const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const supabase = require('./config/supabase');

const app = express();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and documents
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and documents are allowed'));
    }
  }
});

// Basic middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  console.log(`🔍 Query:`, req.query);
  console.log(`📦 Body:`, req.body);
  console.log(`🔑 Headers:`, req.headers);
  next();
});

// Simple test endpoint
app.get('/test', (req, res) => {
  console.log('✅ Test endpoint called');
  res.json({ message: 'Backend is working!', timestamp: new Date().toISOString() });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('✅ Health check endpoint called');
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Auth endpoints
app.post('/api/auth/login', async (req, res) => {
  console.log('🔐 Login attempt:', req.body);
  const { email, password } = req.body;
  
  try {
    // Check if user exists in Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // For now, accept admin123 password (in production, use proper password hashing)
    if (password === 'admin123') {
      console.log('✅ Login successful:', email);
      res.json({
        success: true,
        token: 'mock-jwt-token-' + Date.now(),
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          department: user.department
        }
      });
    } else {
      console.log('❌ Invalid password for:', email);
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  console.log('👤 Auth check endpoint called');
  const authHeader = req.headers.authorization;
  console.log('🔑 Auth header:', authHeader);
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      // For now, return admin user (in production, decode JWT token)
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'admin@dsp.com')
        .single();

      if (user) {
        res.json({
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          department: user.department
        });
      } else {
        res.status(401).json({ message: 'User not found' });
      }
    } catch (error) {
      console.error('❌ Auth check error:', error);
      res.status(401).json({ message: 'Invalid token' });
    }
  } else {
    res.status(401).json({ message: 'No token provided' });
  }
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  console.log('📁 File upload requested:', req.file?.originalname);
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = path.extname(req.file.originalname);
    const filename = `evidence-${timestamp}-${Math.floor(Math.random() * 1000000000)}${ext}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('evidence')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ Error uploading file:', error);
      return res.status(500).json({ message: 'Failed to upload file' });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('evidence')
      .getPublicUrl(filename);

    console.log('✅ File uploaded:', filename);
    res.json({
      filename: filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: urlData.publicUrl,
      uploadedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ File upload error:', error);
    res.status(500).json({ message: 'Failed to upload file' });
  }
});

// Multiple file upload endpoint
app.post('/api/upload/multiple', upload.array('files', 10), async (req, res) => {
  console.log('📁 Multiple file upload requested:', req.files?.length, 'files');
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const uploadResults = [];

    for (const file of req.files) {
      // Generate unique filename
      const timestamp = Date.now();
      const ext = path.extname(file.originalname);
      const filename = `evidence-${timestamp}-${Math.floor(Math.random() * 1000000000)}${ext}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('evidence')
        .upload(filename, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Error uploading file:', file.originalname, error);
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('evidence')
        .getPublicUrl(filename);

      uploadResults.push({
        filename: filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        url: urlData.publicUrl,
        uploadedAt: new Date().toISOString()
      });
    }

    console.log('✅ Files uploaded:', uploadResults.length);
    res.json({
      files: uploadResults,
      totalUploaded: uploadResults.length,
      totalRequested: req.files.length
    });
  } catch (error) {
    console.error('❌ Multiple file upload error:', error);
    res.status(500).json({ message: 'Failed to upload files' });
  }
});

// Users endpoints
app.get('/api/users', async (req, res) => {
  console.log('👥 Users list requested');
  try {
    const { search, role, department, status, page = 1, limit = 10 } = req.query;
    
    let query = supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (role) {
      query = query.eq('role', role);
    }
    if (department) {
      query = query.eq('department', department);
    }
    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: users, error, count } = await query;

    if (error) {
      console.error('❌ Error fetching users:', error);
      return res.status(500).json({ message: 'Failed to fetch users' });
    }

    console.log(`✅ Found ${users.length} users`);
    res.json({
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        department: user.department,
        isActive: user.is_active,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        lockUntil: user.lock_until,
        invitationStatus: user.invitation_status,
        invitationExpires: user.invitation_expires,
        jobTitle: user.job_title,
        phone: user.phone
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || users.length,
        pages: Math.ceil((count || users.length) / limit)
      }
    });
  } catch (error) {
    console.error('❌ Users endpoint error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

app.get('/api/users/stats/overview', async (req, res) => {
  console.log('📊 User stats requested');
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('is_active, department');

    if (error) {
      console.error('❌ Error fetching user stats:', error);
      return res.status(500).json({ message: 'Failed to fetch user stats' });
    }

    const stats = {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.is_active).length,
      inactiveUsers: users.filter(u => !u.is_active).length,
      usersByDepartment: Object.entries(
        users.reduce((acc, user) => {
          acc[user.department] = (acc[user.department] || 0) + 1;
          return acc;
        }, {})
      ).map(([department, count]) => ({ department, count }))
    };

    console.log('✅ User stats calculated:', stats);
    res.json(stats);
  } catch (error) {
    console.error('❌ User stats error:', error);
    res.status(500).json({ message: 'Failed to fetch user stats' });
  }
});

app.post('/api/users', async (req, res) => {
  console.log('➕ Creating new user:', req.body);
  try {
    const userData = {
      ...req.body,
      first_name: req.body.firstName,
      last_name: req.body.lastName,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: user, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating user:', error);
      return res.status(500).json({ message: 'Failed to create user' });
    }

    console.log('✅ User created:', user.id);
    res.json({ user });
  } catch (error) {
    console.error('❌ Create user error:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  console.log('✏️ Updating user:', req.params.id);
  try {
    const updateData = {
      ...req.body,
      first_name: req.body.firstName,
      last_name: req.body.lastName,
      updated_at: new Date().toISOString()
    };

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating user:', error);
      return res.status(500).json({ message: 'Failed to update user' });
    }

    console.log('✅ User updated:', user.id);
    res.json({ user });
  } catch (error) {
    console.error('❌ Update user error:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

app.put('/api/users/:id/password', async (req, res) => {
  console.log('🔑 Changing password for user:', req.params.id);
  try {
    // In a real app, you'd hash the password here
    const { newPassword } = req.body;
    
    const { data: user, error } = await supabase
      .from('users')
      .update({ 
        password: newPassword, // In production, hash this password
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error changing password:', error);
      return res.status(500).json({ message: 'Failed to change password' });
    }

    console.log('✅ Password changed for user:', user.id);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
});

app.put('/api/users/:id/lock', async (req, res) => {
  console.log('🔒 Toggling lock for user:', req.params.id);
  try {
    const { locked } = req.body;
    const lockUntil = locked ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null; // 24 hours
    
    const { data: user, error } = await supabase
      .from('users')
      .update({ 
        lock_until: lockUntil,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error toggling lock:', error);
      return res.status(500).json({ message: 'Failed to toggle lock' });
    }

    console.log('✅ Lock toggled for user:', user.id);
    res.json({ 
      message: locked ? 'User locked successfully' : 'User unlocked successfully',
      user 
    });
  } catch (error) {
    console.error('❌ Toggle lock error:', error);
    res.status(500).json({ message: 'Failed to toggle lock' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  console.log('🗑️ Deactivating user:', req.params.id);
  try {
    const { data: user, error } = await supabase
      .from('users')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error deactivating user:', error);
      return res.status(500).json({ message: 'Failed to deactivate user' });
    }

    console.log('✅ User deactivated:', user.id);
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('❌ Deactivate user error:', error);
    res.status(500).json({ message: 'Failed to deactivate user' });
  }
});

// Cases endpoints
app.get('/api/cases', async (req, res) => {
  console.log('📋 Cases list requested');
  try {
    const { data: cases, error } = await supabase
      .from('incidents')
      .select(`
        *,
        reporter:users!incidents_reporter_id_fkey(first_name, last_name, email),
        assigned_user:users!incidents_assigned_to_fkey(first_name, last_name, email)
      `)
      .is('deleted_at', null) // Exclude soft deleted cases
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching cases:', error);
      return res.status(500).json({ message: 'Failed to fetch cases' });
    }

    console.log(`✅ Found ${cases.length} cases`);
    res.json({
      cases: cases.map(incident => ({
        id: incident.id,
        title: incident.title,
        description: incident.description,
        status: incident.status,
        priority: incident.priority,
        severity: incident.severity,
        caseNumber: incident.case_number,
        reporter: incident.reporter,
        assignedTo: incident.assigned_user,
        createdAt: incident.created_at,
        updatedAt: incident.updated_at
      })),
      total: cases.length
    });
  } catch (error) {
    console.error('❌ Cases endpoint error:', error);
    res.status(500).json({ message: 'Failed to fetch cases' });
  }
});

app.get('/api/cases/stats/dashboard', async (req, res) => {
  console.log('📊 Dashboard stats requested');
  try {
    const { data: incidents, error } = await supabase
      .from('incidents')
      .select('status, priority, severity, incident_type, created_at')
      .is('deleted_at', null); // Exclude soft deleted incidents from stats

    if (error) {
      console.error('❌ Error fetching stats:', error);
      return res.status(500).json({ message: 'Failed to fetch stats' });
    }

    // Calculate overview stats
    const overview = {
      total: incidents.length,
      open: incidents.filter(i => ['reported', 'under_review', 'in_progress'].includes(i.status)).length,
      resolved: incidents.filter(i => ['resolved', 'closed'].includes(i.status)).length,
      critical: incidents.filter(i => i.severity === 'critical').length,
      high: incidents.filter(i => i.severity === 'high').length,
      urgent: incidents.filter(i => i.priority === 'urgent').length
    };

    // Calculate status breakdown
    const statusCounts = {};
    incidents.forEach(incident => {
      statusCounts[incident.status] = (statusCounts[incident.status] || 0) + 1;
    });
    const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count
    }));

    // Calculate type breakdown
    const typeCounts = {};
    incidents.forEach(incident => {
      typeCounts[incident.incident_type] = (typeCounts[incident.incident_type] || 0) + 1;
    });
    const typeBreakdown = Object.entries(typeCounts).map(([type, count]) => ({
      type,
      count
    }));

    // Calculate monthly trends
    const monthlyCounts = {};
    incidents.forEach(incident => {
      const date = new Date(incident.created_at);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
    });
    const monthlyTrends = Object.entries(monthlyCounts).map(([month, count]) => ({
      month,
      count
    })).sort((a, b) => a.month.localeCompare(b.month));

    // Recent activity
    const recentActivity = incidents
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map(incident => ({
        id: incident.id,
        action: 'Created',
        timestamp: incident.created_at
      }));

    const stats = {
      overview,
      statusBreakdown,
      typeBreakdown,
      monthlyTrends,
      recentActivity
    };

    console.log('✅ Dashboard stats calculated:', stats);
    res.json(stats);
  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
});

// Incidents endpoints
app.get('/api/incidents', async (req, res) => {
  console.log('📋 Incidents list requested');
  try {
    const { data: incidents, error } = await supabase
      .from('incidents')
      .select(`
        *,
        reporter:users!incidents_reporter_id_fkey(first_name, last_name, email),
        assigned_user:users!incidents_assigned_to_fkey(first_name, last_name, email)
      `)
      .is('deleted_at', null) // Exclude soft deleted incidents
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching incidents:', error);
      return res.status(500).json({ message: 'Failed to fetch incidents' });
    }

    console.log(`✅ Found ${incidents.length} incidents`);
    res.json({
      incidents: incidents.map(incident => ({
        id: incident.id,
        title: incident.title,
        description: incident.description,
        incidentType: incident.incident_type,
        status: incident.status,
        priority: incident.priority,
        severity: incident.severity,
        caseNumber: incident.case_number,
        reporter: incident.reporter,
        assignedTo: incident.assigned_user,
        infringedContent: incident.infringed_content,
        infringedUrls: incident.infringed_urls,
        infringerInfo: incident.infringer_info,
        tags: incident.tags,
        createdAt: incident.created_at,
        updatedAt: incident.updated_at
      })),
      total: incidents.length
    });
  } catch (error) {
    console.error('❌ Incidents endpoint error:', error);
    res.status(500).json({ message: 'Failed to fetch incidents' });
  }
});

app.post('/api/incidents', upload.array('evidenceFiles', 10), async (req, res) => {
  console.log('➕ New incident creation:', req.body);
  console.log('📁 Files uploaded:', req.files?.length || 0);
  
  try {
    // Get admin user ID for reporter
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'admin@dsp.com')
      .single();

    if (adminError || !adminUser) {
      console.error('❌ Error finding admin user:', adminError);
      return res.status(500).json({ message: 'Failed to find admin user' });
    }

    // Parse JSON fields that come as strings from multipart/form-data
    let infringedUrls = [];
    let infringerInfo = {};
    let tags = [];
    let evidenceFiles = [];

    try {
      if (req.body.infringedUrls) {
        infringedUrls = typeof req.body.infringedUrls === 'string' 
          ? JSON.parse(req.body.infringedUrls) 
          : req.body.infringedUrls;
      }
      if (req.body.infringerInfo) {
        infringerInfo = typeof req.body.infringerInfo === 'string'
          ? JSON.parse(req.body.infringerInfo)
          : req.body.infringerInfo;
      }
      if (req.body.tags) {
        tags = typeof req.body.tags === 'string'
          ? JSON.parse(req.body.tags)
          : req.body.tags;
      }
    } catch (parseError) {
      console.error('❌ Error parsing JSON fields:', parseError);
      return res.status(400).json({ message: 'Invalid JSON data in form fields' });
    }

    // Handle file uploads to Supabase Storage
    if (req.files && req.files.length > 0) {
      console.log('📤 Uploading files to Supabase Storage...');
      for (const file of req.files) {
        try {
          const timestamp = Date.now();
          const ext = path.extname(file.originalname);
          const filename = `evidence-${timestamp}-${Math.floor(Math.random() * 1000000000)}${ext}`;

          const { data, error } = await supabase.storage
            .from('evidence')
            .upload(filename, file.buffer, {
              contentType: file.mimetype,
              cacheControl: '3600',
              upsert: false
            });

          if (error) {
            console.error('❌ Error uploading file:', file.originalname, error);
            continue;
          }

          const { data: urlData } = supabase.storage
            .from('evidence')
            .getPublicUrl(filename);

          evidenceFiles.push({
            filename: filename,
            originalName: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
            url: urlData.publicUrl,
            uploadedAt: new Date().toISOString()
          });
        } catch (fileError) {
          console.error('❌ File upload error:', fileError);
        }
      }
    }

    const incidentData = {
      title: req.body.title,
      description: req.body.description,
      reporter_id: adminUser.id, // Use real admin UUID
      incident_type: req.body.incidentType, // Map incidentType to incident_type
      severity: req.body.severity,
      status: 'reported',
      priority: req.body.priority,
      infringed_content: req.body.infringedContent,
      infringed_urls: infringedUrls,
      infringer_info: infringerInfo,
      tags: tags,
      evidence_files: evidenceFiles,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: incident, error } = await supabase
      .from('incidents')
      .insert([incidentData])
      .select(`
        *,
        reporter:users!incidents_reporter_id_fkey(first_name, last_name, email),
        assigned_user:users!incidents_assigned_to_fkey(first_name, last_name, email)
      `)
      .single();

    if (error) {
      console.error('❌ Error creating incident:', error);
      return res.status(500).json({ message: 'Failed to create incident' });
    }

    console.log('✅ Incident created:', incident.id);
    res.json({ 
      incident: {
        id: incident.id,
        title: incident.title,
        description: incident.description,
        incidentType: incident.incident_type,
        status: incident.status,
        priority: incident.priority,
        severity: incident.severity,
        caseNumber: incident.case_number,
        reporter: incident.reporter,
        assignedTo: incident.assigned_user,
        infringedContent: incident.infringed_content,
        infringedUrls: incident.infringed_urls,
        infringerInfo: incident.infringer_info,
        tags: incident.tags,
        evidenceFiles: incident.evidence_files,
        createdAt: incident.created_at,
        updatedAt: incident.updated_at
      }
    });
  } catch (error) {
    console.error('❌ Create incident error:', error);
    res.status(500).json({ message: 'Failed to create incident' });
  }
});

// Get deleted incidents (admin/manager only) - MUST come before /:id route
app.get('/api/incidents/deleted/list', async (req, res) => {
  console.log('📋 Deleted incidents list requested');
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Check if user is admin or manager
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(403).json({ message: 'Unauthorized: Invalid user' });
    }

    if (user.role !== 'admin' && user.role !== 'manager') {
      return res.status(403).json({ message: 'Unauthorized: Only admins and managers can view deleted incidents' });
    }

    // Fetch deleted incidents
    const { data: incidents, error } = await supabase
      .from('incidents')
      .select(`
        *,
        reporter:users!incidents_reporter_id_fkey(first_name, last_name, email),
        assigned_user:users!incidents_assigned_to_fkey(first_name, last_name, email),
        deleted_by_user:users!incidents_deleted_by_fkey(first_name, last_name, email)
      `)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching deleted incidents:', error);
      return res.status(500).json({ message: 'Failed to fetch deleted incidents' });
    }

    console.log(`✅ Found ${incidents.length} deleted incidents`);
    res.json({
      incidents: incidents.map(incident => ({
        id: incident.id,
        title: incident.title,
        description: incident.description,
        incidentType: incident.incident_type,
        status: incident.status,
        priority: incident.priority,
        severity: incident.severity,
        caseNumber: incident.case_number,
        reporter: incident.reporter,
        assignedTo: incident.assigned_user,
        deletedAt: incident.deleted_at,
        deletedBy: incident.deleted_by_user,
        deletedReason: incident.deleted_reason,
        createdAt: incident.created_at
      })),
      total: incidents.length
    });
  } catch (error) {
    console.error('❌ Deleted incidents error:', error);
    res.status(500).json({ message: 'Failed to fetch deleted incidents' });
  }
});

// Restore deleted incident (admin/manager only) - MUST come before /:id route
app.post('/api/incidents/:id/restore', async (req, res) => {
  console.log('♻️ Restoring incident:', req.params.id);
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Check if user is admin or manager
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(403).json({ message: 'Unauthorized: Invalid user' });
    }

    if (user.role !== 'admin' && user.role !== 'manager') {
      return res.status(403).json({ message: 'Unauthorized: Only admins and managers can restore incidents' });
    }

    // Restore the incident
    const { data: incident, error } = await supabase
      .from('incidents')
      .update({
        deleted_at: null,
        deleted_by: null,
        deleted_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error restoring incident:', error);
      return res.status(500).json({ message: 'Failed to restore incident' });
    }

    console.log('✅ Incident restored:', incident.id);
    res.json({ 
      message: 'Incident restored successfully',
      incident: {
        id: incident.id,
        title: incident.title,
        status: incident.status
      }
    });
  } catch (error) {
    console.error('❌ Restore error:', error);
    res.status(500).json({ message: 'Failed to restore incident' });
  }
});

// Get incident by ID - comes AFTER specific routes
app.get('/api/incidents/:id', async (req, res) => {
  console.log('🔍 Incident detail requested:', req.params.id);
  try {
    const { data: incident, error } = await supabase
      .from('incidents')
      .select(`
        *,
        reporter:users!incidents_reporter_id_fkey(first_name, last_name, email),
        assigned_user:users!incidents_assigned_to_fkey(first_name, last_name, email)
      `)
      .eq('id', req.params.id)
      .single();

    if (error) {
      console.error('❌ Error fetching incident:', error);
      return res.status(404).json({ message: 'Incident not found' });
    }

    console.log('✅ Incident found:', incident.id);
    res.json({
      id: incident.id,
      title: incident.title,
      description: incident.description,
      incidentType: incident.incident_type,
      status: incident.status,
      priority: incident.priority,
      severity: incident.severity,
      caseNumber: incident.case_number,
      reporter: incident.reporter,
      assignedTo: incident.assigned_user,
      infringedContent: incident.infringed_content,
      infringedUrls: incident.infringed_urls,
      infringerInfo: incident.infringer_info,
      tags: incident.tags,
      notes: incident.notes,
      createdAt: incident.created_at,
      updatedAt: incident.updated_at
    });
  } catch (error) {
    console.error('❌ Incident detail error:', error);
    res.status(500).json({ message: 'Failed to fetch incident' });
  }
});

// Soft delete incident (admin/manager only) - DELETE comes after GET
app.delete('/api/incidents/:id', async (req, res) => {
  console.log('🗑️ Soft deleting incident:', req.params.id);
  try {
    const { reason, userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required for audit trail' });
    }

    // Check if user is admin or manager
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(403).json({ message: 'Unauthorized: Invalid user' });
    }

    if (user.role !== 'admin' && user.role !== 'manager') {
      return res.status(403).json({ message: 'Unauthorized: Only admins and managers can delete incidents' });
    }

    // Soft delete the incident
    const { data: incident, error } = await supabase
      .from('incidents')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
        deleted_reason: reason || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error soft deleting incident:', error);
      return res.status(500).json({ message: 'Failed to delete incident' });
    }

    console.log('✅ Incident soft deleted:', incident.id);
    res.json({ 
      message: 'Incident deleted successfully',
      incident: {
        id: incident.id,
        deletedAt: incident.deleted_at,
        deletedBy: incident.deleted_by
      }
    });
  } catch (error) {
    console.error('❌ Soft delete error:', error);
    res.status(500).json({ message: 'Failed to delete incident' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error occurred:', err);
  console.error('❌ Error stack:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: err.message || 'Unknown error'
  });
});

// 404 handler with detailed logging
app.use('*', (req, res) => {
  console.log('❌ Route not found:', req.method, req.originalUrl);
  console.log('🔍 Available routes: /test, /api/health, /api/auth/login, /api/auth/me, /api/users, /api/users/stats/overview, /api/cases, /api/cases/stats/dashboard, /api/incidents, /api/upload, /api/upload/multiple');
  res.status(404).json({ 
    message: 'Route not found',
    method: req.method,
    path: req.originalUrl,
    availableRoutes: ['/test', '/api/health', '/api/auth/login', '/api/auth/me', '/api/users', '/api/users/stats/overview', '/api/cases', '/api/cases/stats/dashboard', '/api/incidents', '/api/upload', '/api/upload/multiple']
  });
});

console.log('🚀 Supabase-connected backend initialized with logging');
console.log('📊 Environment:', process.env.NODE_ENV || 'development');
console.log('🗄️ Database: Supabase');

module.exports = app;
