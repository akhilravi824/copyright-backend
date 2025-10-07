const express = require('express');
const cors = require('cors');
const supabase = require('./config/supabase');

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

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

// Users endpoint
app.get('/api/users', async (req, res) => {
  console.log('👥 Users list requested');
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

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
        createdAt: user.created_at
      })),
      total: users.length
    });
  } catch (error) {
    console.error('❌ Users endpoint error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
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
      .select('status, priority, severity, incident_type, created_at');

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

app.post('/api/incidents', async (req, res) => {
  console.log('➕ New incident creation:', req.body);
  try {
    const incidentData = {
      ...req.body,
      reporter_id: 'admin-user-id', // In production, get from JWT token
      status: 'reported',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: incident, error } = await supabase
      .from('incidents')
      .insert([incidentData])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating incident:', error);
      return res.status(500).json({ message: 'Failed to create incident' });
    }

    console.log('✅ Incident created:', incident.id);
    res.json({ incident });
  } catch (error) {
    console.error('❌ Create incident error:', error);
    res.status(500).json({ message: 'Failed to create incident' });
  }
});

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
  console.log('🔍 Available routes: /test, /api/health, /api/auth/login, /api/auth/me, /api/users, /api/cases, /api/cases/stats/dashboard, /api/incidents');
  res.status(404).json({ 
    message: 'Route not found',
    method: req.method,
    path: req.originalUrl,
    availableRoutes: ['/test', '/api/health', '/api/auth/login', '/api/auth/me', '/api/users', '/api/cases', '/api/cases/stats/dashboard', '/api/incidents']
  });
});

console.log('🚀 Supabase-connected backend initialized with logging');
console.log('📊 Environment:', process.env.NODE_ENV || 'development');
console.log('🗄️ Database: Supabase');

module.exports = app;
