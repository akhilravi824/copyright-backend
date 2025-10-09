const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const supabase = require('./config/supabase');
const emailService = require('./services/emailService');

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
  console.log('✅ Test endpoint called - Version 2.3 - INVITATION ROUTES INCLUDED');
  res.json({ 
    message: 'Backend is working!', 
    timestamp: new Date().toISOString(), 
    version: '2.3',
    features: ['invitations', 'user-management', 'incidents', 'cases'],
    routes: ['/api/invitations', '/api/users', '/api/incidents', '/api/cases']
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('✅ Health check endpoint called');
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test search endpoint for debugging
app.get('/api/test-search', async (req, res) => {
  try {
    const { search } = req.query;
    console.log('🧪 Test search:', search);
    
    const searchPattern = `%${search}%`;
    
    // Try multiple approaches
    const { data, error } = await supabase
      .from('incidents')
      .select('id, title, description, case_number')
      .or(`title.ilike.%${search}%,description.ilike.%${search}%,case_number.ilike.%${search}%`)
      .limit(5);
    
    // Also test with .ilike() method directly
    const { data: data2, error: error2 } = await supabase
      .from('incidents')
      .select('id, title, description, case_number')
      .ilike('title', searchPattern)
      .limit(5);
    
    console.log(`Test 1 (or): ${data?.length || 0} results`);
    console.log(`Test 2 (ilike): ${data2?.length || 0} results`);
    
    if (error) {
      console.error('❌ Test search error:', error);
      return res.status(500).json({ error: error.message, details: error });
    }
    
    console.log(`✅ Test search found ${data?.length || 0} results`);
    res.json({ 
      search, 
      searchPattern, 
      test1_or: { results: data, count: data?.length || 0 },
      test2_ilike: { results: data2, count: data2?.length || 0 }
    });
  } catch (error) {
    console.error('❌ Test search exception:', error);
    res.status(500).json({ error: error.message });
  }
});

// Auth endpoints
app.post('/api/auth/login', async (req, res) => {
  console.log('🔐 Login attempt (NEW CODE v2):', req.body);
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

    // Check password (for demo, accept password_hash as plain text)
    if (user.password_hash === password) {
      console.log('✅ Login successful:', email);
      // Create a simple token that includes user email (base64 encoded)
      const tokenPayload = JSON.stringify({ email: user.email, id: user.id });
      const token = 'Bearer-' + Buffer.from(tokenPayload).toString('base64');
      
      res.json({
        success: true,
        token: token,
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
      const token = authHeader.substring(7); // Remove 'Bearer '
      
      // Decode the token to get user email
      let userEmail;
      if (token.startsWith('Bearer-')) {
        // Our custom token format
        const base64Payload = token.substring(7); // Remove 'Bearer-'
        const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
        userEmail = payload.email;
        console.log('🔓 Decoded token for user:', userEmail);
      } else {
        // Old token format - fallback to admin
        console.warn('⚠️  Old token format detected, defaulting to admin');
        userEmail = 'admin@dsp.com';
      }
      
      // Fetch the user from database
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', userEmail)
        .eq('is_active', true)
        .single();

      if (error || !user) {
        console.error('❌ User not found:', userEmail);
        return res.status(401).json({ message: 'User not found' });
      }

      console.log('✅ Auth check successful for:', user.email, 'Role:', user.role);
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        department: user.department
      });
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
    // Validate required fields
    if (!req.body.firstName || !req.body.lastName || !req.body.email) {
      return res.status(400).json({ message: 'First name, last name, and email are required' });
    }

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', req.body.email.toLowerCase())
      .single();

    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Map frontend field names to database field names
    const userData = {
      first_name: req.body.firstName,
      last_name: req.body.lastName,
      email: req.body.email.toLowerCase(), // Ensure lowercase email
      password_hash: req.body.password || 'changeme123', // Fixed: use password_hash instead of password
      role: req.body.role || 'viewer',
      department: req.body.department || 'legal',
      phone: req.body.phone || null,
      job_title: req.body.jobTitle || null,
      is_active: true,
      email_verified: true, // Add email_verified field
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📤 Creating user with data:', userData);

    const { data: user, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating user:', error);
      return res.status(500).json({ message: 'Failed to create user', error: error.message });
    }

    console.log('✅ User created:', user.id);
    res.json({ 
      success: true,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        department: user.department,
        jobTitle: user.job_title,
        phone: user.phone,
        isActive: user.is_active
      }
    });
  } catch (error) {
    console.error('❌ Create user error:', error);
    res.status(500).json({ message: 'Failed to create user', error: error.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  console.log('✏️ Updating user:', req.params.id);
  console.log('📦 Update data received:', req.body);
  try {
    // Map frontend field names to database field names
    const updateData = {
      first_name: req.body.firstName,
      last_name: req.body.lastName,
      email: req.body.email,
      role: req.body.role,
      department: req.body.department,
      phone: req.body.phone || null,
      job_title: req.body.jobTitle || null,
      is_active: req.body.isActive !== undefined ? req.body.isActive : true,
      updated_at: new Date().toISOString()
    };

    console.log('📤 Sending to Supabase:', updateData);

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating user:', error);
      return res.status(500).json({ message: 'Failed to update user', error: error.message });
    }

    console.log('✅ User updated:', user.id);
    res.json({ user });
  } catch (error) {
    console.error('❌ Update user error:', error);
    res.status(500).json({ message: 'Failed to update user', error: error.message });
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
      console.error('❌ Supabase error details:', JSON.stringify(error, null, 2));
      return res.status(500).json({ message: 'Failed to deactivate user', error: error.message });
    }

    if (!user) {
      console.error('❌ User not found:', req.params.id);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('✅ User deactivated:', user.id);
    res.json({ message: 'User deactivated successfully', user });
  } catch (error) {
    console.error('❌ Deactivate user error:', error);
    res.status(500).json({ message: 'Failed to deactivate user', error: error.message });
  }
});

// Cases endpoints
app.get('/api/cases', async (req, res) => {
  console.log('📋 Cases list requested');
  console.log('🔍 Query params:', req.query);
  try {
    const { search, status, incidentType, severity, priority, assignedTo, view, sort, page = 1, limit = 10 } = req.query;
    console.log('🔎 Search term:', search);

    // Helper function to build query with filters
    const buildQuery = () => {
      let query = supabase
        .from('incidents')
        .select(`
          *,
          reporter:users!incidents_reporter_id_fkey(first_name, last_name, email),
          assigned_user:users!incidents_assigned_to_fkey(first_name, last_name, email)
        `, { count: 'exact' })
        .is('deleted_at', null); // Exclude soft deleted cases

      // Apply filters
      if (search) {
        console.log('🔎 Applying search filter:', search);
        const searchPattern = `%${search}%`;
        console.log('🔍 Search pattern:', searchPattern);
        
        // IMPORTANT: Supabase PostgREST or() syntax requires proper escaping
        // For ilike with wildcards in or(), the format is: column.ilike.*pattern*
        // where *pattern* includes the % wildcards
        const orQuery = `title.ilike.*${search}*,description.ilike.*${search}*,case_number.ilike.*${search}*`;
        console.log('🔍 OR Query string:', orQuery);
        query = query.or(orQuery);
        console.log('✅ Search filter applied to title, description, case_number');
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (incidentType) {
        query = query.eq('incident_type', incidentType);
      }
      if (severity) {
        query = query.eq('severity', severity);
      }
      if (priority) {
        query = query.eq('priority', priority);
      }
      if (assignedTo) {
        query = query.eq('assigned_to', assignedTo);
      }

      // Apply sorting
      if (sort === 'date_asc') {
        query = query.order('created_at', { ascending: true });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      return query;
    };

    // Get all cases for stats (before pagination)
    const allCasesQuery = buildQuery();
    console.log('📝 Query built for stats');
    const { data: allCases, error: allError } = await allCasesQuery;
    
    if (allError) {
      console.error('❌ Error fetching all cases for stats:', allError);
      console.error('❌ Supabase error details:', JSON.stringify(allError, null, 2));
      return res.status(500).json({ message: 'Failed to fetch cases for stats', error: allError.message });
    }
    
    console.log(`📊 Found ${allCases?.length || 0} cases matching filters`);
    if (search && allCases) {
      console.log('🔍 Sample titles:', allCases.slice(0, 3).map(c => c.title));
    }

    // Calculate stats from all filtered cases
    const stats = {
      total: allCases?.length || 0,
      open: allCases?.filter(c => ['reported', 'under_review', 'in_progress'].includes(c.status)).length || 0,
      resolved: allCases?.filter(c => ['resolved', 'closed'].includes(c.status)).length || 0,
      critical: allCases?.filter(c => c.severity === 'critical').length || 0
    };
    console.log('📊 Calculated stats:', stats);

    // Build query again for pagination
    const paginatedQuery = buildQuery();
    const from = (parseInt(page) - 1) * parseInt(limit);
    const to = from + parseInt(limit) - 1;
    paginatedQuery.range(from, to);

    const { data: cases, error, count } = await paginatedQuery;

    if (error) {
      console.error('❌ Error fetching paginated cases:', error);
      return res.status(500).json({ message: 'Failed to fetch cases', error: error.message });
    }

    const totalPages = stats.total > 0 ? Math.ceil(stats.total / limit) : 1;
    console.log(`✅ Found ${cases?.length || 0} cases (page ${page} of ${totalPages})`);
    
    res.json({
      cases: (cases || []).map(incident => ({
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
      pagination: {
        current: parseInt(page),
        page: parseInt(page),
        limit: parseInt(limit),
        total: stats.total,
        pages: totalPages
      },
      stats: stats
    });
  } catch (error) {
    console.error('❌ Cases endpoint error:', error);
    res.status(500).json({ message: 'Failed to fetch cases', error: error.message });
  }
});

// Get single case detail
app.get('/api/cases/:id', async (req, res) => {
  console.log('🔍 Case detail requested:', req.params.id);
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
      console.error('❌ Error fetching case:', error);
      return res.status(404).json({ message: 'Case not found' });
    }

    console.log('✅ Case found:', incident.id);
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
      evidenceFiles: incident.evidence_files,
      notes: incident.notes,
      createdAt: incident.created_at,
      updatedAt: incident.updated_at
    });
  } catch (error) {
    console.error('❌ Case detail error:', error);
    res.status(500).json({ message: 'Failed to fetch case' });
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
  console.log('🔍 Query params:', req.query);
  try {
    const { reporter_id } = req.query;
    
    let query = supabase
      .from('incidents')
      .select(`
        *,
        reporter:users!incidents_reporter_id_fkey(first_name, last_name, email),
        assigned_user:users!incidents_assigned_to_fkey(first_name, last_name, email)
      `)
      .is('deleted_at', null); // Exclude soft deleted incidents
    
    // Filter by reporter_id for analyst role
    if (reporter_id) {
      console.log('🔒 Filtering by reporter_id:', reporter_id);
      // Only show incidents where reporter_id matches AND is not null
      query = query.eq('reporter_id', reporter_id);
    }
    
    query = query.order('created_at', { ascending: false });
    
    const { data: incidents, error } = await query;

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

// Soft delete incident (admin/manager only) - MUST come BEFORE /:id route
app.post('/api/incidents/:id/delete', async (req, res) => {
  console.log('🗑️ Soft delete request received for incident:', req.params.id);
  console.log('🗑️ Request body:', req.body);
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

// =====================================================
// INVITATION SYSTEM ENDPOINTS
// =====================================================

// Create invitation
app.post('/api/invitations', async (req, res) => {
  console.log('📧 Creating invitation:', req.body);
  try {
    const { email, role = 'staff', department, job_title, custom_message } = req.body;
    
    // Validate required fields
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Check if user already exists
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id, email, is_active')
      .eq('email', email.toLowerCase())
      .single();
    
    if (existingUser && existingUser.is_active) {
      return res.status(400).json({ message: 'User already exists and is active' });
    }
    
    // Check for existing pending invitation
    const { data: existingInvitation, error: inviteCheckError } = await supabase
      .from('user_invitations')
      .select('id, invitation_status, expires_at')
      .eq('email', email.toLowerCase())
      .eq('invitation_status', 'pending')
      .single();
    
    if (existingInvitation && existingInvitation.expires_at > new Date()) {
      return res.status(400).json({ message: 'Pending invitation already exists for this email' });
    }
    
    // Generate invitation token
    const invitationToken = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Create invitation record
    const { data: invitation, error: createError } = await supabase
      .from('user_invitations')
      .insert({
        email: email.toLowerCase(),
        role,
        department,
        job_title,
        invitation_token: invitationToken,
        expires_at: expiresAt,
        invited_by: 'c36e79b9-35fe-4e8a-9f8f-e501e42a4016', // Lisa Thompson (Manager) - TODO: Get from auth
        custom_message,
        email_delivery_status: 'pending'
      })
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Error creating invitation:', createError);
      return res.status(500).json({ message: 'Failed to create invitation' });
    }
    
    // Send invitation email using Supabase Auth
    try {
      console.log('📧 Sending invitation email via Supabase Auth...');
      
      // Use Supabase Auth to send invitation email
      const { data: authInvite, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
          role: role,
          department: department,
          job_title: job_title,
          invitation_token: invitationToken,
          custom_message: custom_message
        },
        redirectTo: `${process.env.CLIENT_URL || 'http://localhost:3000'}/invite/${invitationToken}`
      });

      if (authError) {
        console.error('❌ Supabase Auth invitation failed:', authError);
        throw authError;
      }

      console.log('✅ Supabase Auth invitation sent:', authInvite);
      
      // Update invitation with Supabase Auth details
      await supabase
        .from('user_invitations')
        .update({ 
          supabase_user_id: authInvite.user?.id,
          supabase_invite_id: authInvite.user?.id,
          email_sent_at: new Date().toISOString(),
          email_delivery_status: 'sent'
        })
        .eq('id', invitation.id);

    } catch (emailError) {
      console.error('❌ Failed to send invitation email:', emailError);
      
      // Fallback: Provide manual link
      const invitationLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/invite/${invitationToken}`;
      console.log('📧 Fallback: Manual invitation link:', invitationLink);
      
      await supabase
        .from('user_invitations')
        .update({ 
          email_delivery_status: 'failed',
          email_error_message: emailError.message,
          custom_message: `Email failed. Manual link: ${invitationLink}`
        })
        .eq('id', invitation.id);
    }
    
    res.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        department: invitation.department,
        job_title: invitation.job_title,
        expires_at: invitation.expires_at,
        invitation_link: invitationLink,
        message: "Invitation created successfully! Copy the invitation link to share with the user."
      }
    });
  } catch (error) {
    console.error('❌ Invitation creation error:', error);
    res.status(500).json({ message: 'Failed to create invitation' });
  }
});

// List invitations
app.get('/api/invitations', async (req, res) => {
  console.log('📋 Listing invitations');
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    let query = supabase
      .from('user_invitations')
      .select(`
        *,
        invited_by_user:users!user_invitations_invited_by_fkey(first_name, last_name, email),
        revoked_by_user:users!user_invitations_revoked_by_fkey(first_name, last_name, email)
      `)
      .order('created_at', { ascending: false });
    
    if (status) {
      query = query.eq('invitation_status', status);
    }
    
    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);
    
    const { data: invitations, error } = await query;
    
    if (error) {
      console.error('❌ Error fetching invitations:', error);
      return res.status(500).json({ message: 'Failed to fetch invitations' });
    }
    
    // Get total count
    const { count } = await supabase
      .from('user_invitations')
      .select('*', { count: 'exact', head: true });
    
    res.json({
      invitations: invitations.map(invitation => ({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        department: invitation.department,
        job_title: invitation.job_title,
        invitation_status: invitation.invitation_status,
        expires_at: invitation.expires_at,
        invited_at: invitation.invited_at,
        accepted_at: invitation.accepted_at,
        revoked_at: invitation.revoked_at,
        resend_count: invitation.resend_count,
        custom_message: invitation.custom_message,
        invited_by: invitation.invited_by_user,
        revoked_by: invitation.revoked_by_user
      })),
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('❌ Invitations list error:', error);
    res.status(500).json({ message: 'Failed to fetch invitations' });
  }
});

// Resend invitation
app.post('/api/invitations/:id/resend', async (req, res) => {
  console.log('🔄 Resending invitation:', req.params.id);
  try {
    const { data: invitation, error: fetchError } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (fetchError || !invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }
    
    if (invitation.invitation_status !== 'pending') {
      return res.status(400).json({ message: 'Can only resend pending invitations' });
    }
    
    if (invitation.resend_count >= 3) {
      return res.status(400).json({ message: 'Maximum resend attempts reached' });
    }
    
    // Generate new token and extend expiration
    const newToken = require('crypto').randomBytes(32).toString('hex');
    const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    const { data: updatedInvitation, error: updateError } = await supabase
      .from('user_invitations')
      .update({
        invitation_token: newToken,
        expires_at: newExpiresAt,
        resend_count: invitation.resend_count + 1,
        last_resend_at: new Date(),
        email_delivery_status: 'pending'
      })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error resending invitation:', updateError);
      return res.status(500).json({ message: 'Failed to resend invitation' });
    }
    
    // TODO: Send new email invitation
    const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invite/${newToken}`;
    console.log('📧 Invitation resent:', invitationLink);
    
    res.json({
      success: true,
      invitation: {
        id: updatedInvitation.id,
        email: updatedInvitation.email,
        expires_at: updatedInvitation.expires_at,
        resend_count: updatedInvitation.resend_count,
        invitation_link: invitationLink
      }
    });
  } catch (error) {
    console.error('❌ Resend invitation error:', error);
    res.status(500).json({ message: 'Failed to resend invitation' });
  }
});

// Cancel/Revoke invitation
app.post('/api/invitations/:id/cancel', async (req, res) => {
  console.log('❌ Canceling invitation:', req.params.id);
  try {
    const { data: invitation, error: fetchError } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (fetchError || !invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }
    
    if (invitation.invitation_status !== 'pending') {
      return res.status(400).json({ message: 'Can only cancel pending invitations' });
    }
    
    const { data: updatedInvitation, error: updateError } = await supabase
      .from('user_invitations')
      .update({
        invitation_status: 'revoked',
        revoked_at: new Date(),
        revoked_by: 'c36e79b9-35fe-4e8a-9f8f-e501e42a4016' // Lisa Thompson (Manager) - TODO: Get from auth
      })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error canceling invitation:', updateError);
      return res.status(500).json({ message: 'Failed to cancel invitation' });
    }
    
    res.json({
      success: true,
      message: 'Invitation canceled successfully',
      invitation: {
        id: updatedInvitation.id,
        email: updatedInvitation.email,
        invitation_status: updatedInvitation.invitation_status,
        revoked_at: updatedInvitation.revoked_at
      }
    });
  } catch (error) {
    console.error('❌ Cancel invitation error:', error);
    res.status(500).json({ message: 'Failed to cancel invitation' });
  }
});

// Get invitation by token (for invitation acceptance)
app.get('/api/invitations/token/:token', async (req, res) => {
  console.log('🔍 Getting invitation by token:', req.params.token);
  try {
    const { data: invitation, error } = await supabase
      .from('user_invitations')
      .select(`
        *,
        invited_by_user:users!user_invitations_invited_by_fkey(first_name, last_name, email)
      `)
      .eq('invitation_token', req.params.token)
      .eq('invitation_status', 'pending')
      .single();
    
    if (error || !invitation) {
      return res.status(404).json({ message: 'Invalid or expired invitation' });
    }
    
    if (invitation.expires_at < new Date()) {
      // Mark as expired
      await supabase
        .from('user_invitations')
        .update({ invitation_status: 'expired' })
        .eq('id', invitation.id);
      
      return res.status(410).json({ message: 'Invitation has expired' });
    }
    
    res.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        department: invitation.department,
        job_title: invitation.job_title,
        expires_at: invitation.expires_at,
        custom_message: invitation.custom_message,
        invited_by: invitation.invited_by_user
      }
    });
  } catch (error) {
    console.error('❌ Get invitation by token error:', error);
    res.status(500).json({ message: 'Failed to fetch invitation' });
  }
});

// Accept invitation (complete user registration)
app.post('/api/invitations/:token/accept', async (req, res) => {
  console.log('✅ Accepting invitation:', req.params.token);
  try {
    const { first_name, last_name, password, phone } = req.body;
    
    // Get invitation
    const { data: invitation, error: fetchError } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('invitation_token', req.params.token)
      .eq('invitation_status', 'pending')
      .single();
    
    if (fetchError || !invitation) {
      return res.status(404).json({ message: 'Invalid or expired invitation' });
    }
    
    if (invitation.expires_at < new Date()) {
      await supabase
        .from('user_invitations')
        .update({ invitation_status: 'expired' })
        .eq('id', invitation.id);
      
      return res.status(410).json({ message: 'Invitation has expired' });
    }
    
    // Validate required fields
    if (!first_name || !last_name || !password) {
      return res.status(400).json({ message: 'First name, last name, and password are required' });
    }
    
    // Create user in users table
    const { data: user, error: createUserError } = await supabase
      .from('users')
      .insert({
        first_name,
        last_name,
        email: invitation.email,
        password_hash: password, // In production, hash this password
        role: invitation.role,
        department: invitation.department,
        job_title: invitation.job_title,
        phone,
        is_active: true,
        email_verified: true,
        created_by: invitation.invited_by
      })
      .select()
      .single();
    
    if (createUserError) {
      console.error('❌ Error creating user:', createUserError);
      return res.status(500).json({ message: 'Failed to create user account' });
    }
    
    // Mark invitation as accepted
    await supabase
      .from('user_invitations')
      .update({
        invitation_status: 'accepted',
        accepted_at: new Date(),
        supabase_user_id: user.id
      })
      .eq('id', invitation.id);
    
    // Create auth token
    const tokenPayload = JSON.stringify({ email: user.email, id: user.id });
    const token = 'Bearer-' + Buffer.from(tokenPayload).toString('base64');
    
    res.json({
      success: true,
      message: 'Account created successfully',
      token: token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        department: user.department
      }
    });
  } catch (error) {
    console.error('❌ Accept invitation error:', error);
    res.status(500).json({ message: 'Failed to accept invitation' });
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
  console.log('🔍 Request method:', req.method);
  console.log('🔍 Request path:', req.path);
  console.log('🔍 Request params:', req.params);
  console.log('🔍 Available routes: /test, /api/health, /api/auth/*, /api/users/*, /api/cases/*, /api/incidents/*, /api/invitations/*, /api/upload/*');
  res.status(404).json({ 
    message: 'Route not found',
    method: req.method,
    path: req.originalUrl,
    requestedPath: req.path,
    availableRoutes: [
      'GET /test',
      'GET /api/health',
      'POST /api/auth/login',
      'GET /api/auth/me',
      'GET /api/users',
      'GET /api/users/stats/overview',
      'GET /api/cases',
      'GET /api/cases/stats/dashboard',
      'GET /api/incidents',
      'POST /api/invitations',
      'GET /api/invitations',
      'POST /api/invitations/:id/resend',
      'POST /api/invitations/:id/cancel',
      'GET /api/invitations/token/:token',
      'POST /api/invitations/:token/accept',
      'GET /api/incidents/deleted/list',
      'GET /api/incidents/:id',
      'POST /api/incidents',
      'POST /api/incidents/:id/restore',
      'DELETE /api/incidents/:id',
      'POST /api/upload',
      'POST /api/upload/multiple'
    ]
  });
});

console.log('🚀 Supabase-connected backend initialized with logging');
console.log('📊 Environment:', process.env.NODE_ENV || 'development');
console.log('🗄️ Database: Supabase');
console.log('✅ Soft delete endpoint: POST /api/incidents/:id/delete');

module.exports = app;
