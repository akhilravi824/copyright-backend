const supabase = require('../config/supabase');

class SupabaseService {
  constructor() {
    this.client = supabase;
  }

  // User operations
  async createUser(userData) {
    const { data, error } = await this.client
      .from('users')
      .insert([userData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getUserById(id) {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  async getUserByEmail(email) {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateUser(id, updates) {
    const { data, error } = await this.client
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getUsers(filters = {}) {
    let query = this.client.from('users').select('*');
    
    if (filters.search) {
      query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }
    
    if (filters.role) {
      query = query.eq('role', filters.role);
    }
    
    if (filters.department) {
      query = query.eq('department', filters.department);
    }
    
    if (filters.status) {
      if (filters.status === 'active') {
        query = query.eq('is_active', true);
      } else if (filters.status === 'inactive') {
        query = query.eq('is_active', false);
      }
    }
    
    if (filters.page && filters.limit) {
      const offset = (filters.page - 1) * filters.limit;
      query = query.range(offset, offset + filters.limit - 1);
    }
    
    query = query.order('created_at', { ascending: false });
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return {
      users: data,
      total: count,
      page: filters.page || 1,
      limit: filters.limit || 10,
      pages: Math.ceil(count / (filters.limit || 10))
    };
  }

  // Incident operations
  async createIncident(incidentData) {
    const { data, error } = await this.client
      .from('incidents')
      .insert([incidentData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getIncidentById(id) {
    const { data, error } = await this.client
      .from('incidents')
      .select(`
        *,
        reporter:users!incidents_reporter_id_fkey(first_name, last_name, email, department, phone),
        assigned_user:users!incidents_assigned_to_fkey(first_name, last_name, email, phone)
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async listIncidents(filters) {
    let query = this.client
      .from('incidents')
      .select(`
        *,
        reporter:users!incidents_reporter_id_fkey(first_name, last_name, email, department, phone),
        assigned_user:users!incidents_assigned_to_fkey(first_name, last_name, email, phone)
      `);

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.incident_type) {
      query = query.eq('incident_type', filters.incident_type);
    }
    if (filters.severity) {
      query = query.eq('severity', filters.severity);
    }
    if (filters.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to);
    }
    if (filters.reporter_id) {
      query = query.eq('reporter_id', filters.reporter_id);
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,infringed_content.ilike.%${filters.search}%`);
    }

    // Apply pagination
    const offset = (filters.page - 1) * filters.limit;
    query = query.range(offset, offset + filters.limit - 1);

    // Apply sorting
    const sortColumn = filters.sortBy || 'reported_at';
    const ascending = filters.sortOrder !== 'desc';
    query = query.order(sortColumn, { ascending });

    const { data, error, count } = await query;
    
    if (error) throw error;
    return { incidents: data || [], total: count || 0 };
  }

  async updateIncident(id, updates) {
    const { data, error } = await this.client
      .from('incidents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getIncidents(filters = {}) {
    let query = this.client.from('incidents').select(`
      *,
      reporter:users!incidents_reporter_id_fkey(first_name, last_name, email),
      assigned_user:users!incidents_assigned_to_fkey(first_name, last_name, email)
    `);
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.incidentType) {
      query = query.eq('incident_type', filters.incidentType);
    }
    
    if (filters.severity) {
      query = query.eq('severity', filters.severity);
    }
    
    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }
    
    if (filters.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo);
    }
    
    if (filters.reporter) {
      query = query.eq('reporter_id', filters.reporter);
    }
    
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,case_number.ilike.%${filters.search}%`);
    }
    
    if (filters.dateFrom) {
      query = query.gte('reported_at', filters.dateFrom);
    }
    
    if (filters.dateTo) {
      query = query.lte('reported_at', filters.dateTo);
    }
    
    if (filters.page && filters.limit) {
      const offset = (filters.page - 1) * filters.limit;
      query = query.range(offset, offset + filters.limit - 1);
    }
    
    query = query.order(filters.sortBy || 'reported_at', { ascending: filters.sortOrder === 'asc' });
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return {
      incidents: data,
      total: count,
      page: filters.page || 1,
      limit: filters.limit || 20,
      pages: Math.ceil(count / (filters.limit || 20))
    };
  }

  

  async searchIncidents(query, limit = 10) {
    const { data, error } = await this.client
      .from('incidents')
      .select('id, title, status, incident_type, severity, priority, case_number')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%,case_number.ilike.%${query}%`)
      .limit(limit)
      .order('reported_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  // Document operations
  async createDocument(documentData) {
    const { data, error } = await this.client
      .from('documents')
      .insert([documentData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getDocumentsByIncident(incidentId) {
    const { data, error } = await this.client
      .from('documents')
      .select(`
        *,
        uploader:users!documents_uploaded_by_fkey(first_name, last_name, email)
      `)
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  // Template operations
  async createTemplate(templateData) {
    const { data, error } = await this.client
      .from('templates')
      .insert([templateData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getTemplates() {
    const { data, error } = await this.client
      .from('templates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  // Monitoring alerts operations
  async createMonitoringAlert(alertData) {
    const { data, error } = await this.client
      .from('monitoring_alerts')
      .insert([alertData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getMonitoringAlerts(filters = {}) {
    let query = this.client.from('monitoring_alerts').select('*');
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.alertType) {
      query = query.eq('alert_type', filters.alertType);
    }
    
    if (filters.severity) {
      query = query.eq('severity', filters.severity);
    }
    
    if (filters.page && filters.limit) {
      const offset = (filters.page - 1) * filters.limit;
      query = query.range(offset, offset + filters.limit - 1);
    }
    
    query = query.order('created_at', { ascending: false });
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return {
      alerts: data,
      total: count,
      page: filters.page || 1,
      limit: filters.limit || 20,
      pages: Math.ceil(count / (filters.limit || 20))
    };
  }

  // Statistics operations
  async getDashboardStats() {
    const [
      { count: totalIncidents },
      { count: openIncidents },
      { count: resolvedIncidents },
      { count: criticalIncidents },
      { count: totalUsers },
      { count: activeUsers },
      { count: totalAlerts },
      { count: newAlerts }
    ] = await Promise.all([
      this.client.from('incidents').select('*', { count: 'exact', head: true }),
      this.client.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['reported', 'under_review', 'in_progress']),
      this.client.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['resolved', 'closed']),
      this.client.from('incidents').select('*', { count: 'exact', head: true }).eq('severity', 'critical'),
      this.client.from('users').select('*', { count: 'exact', head: true }),
      this.client.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true),
      this.client.from('monitoring_alerts').select('*', { count: 'exact', head: true }),
      this.client.from('monitoring_alerts').select('*', { count: 'exact', head: true }).eq('status', 'new')
    ]);

    return {
      totalIncidents: totalIncidents || 0,
      openIncidents: openIncidents || 0,
      resolvedIncidents: resolvedIncidents || 0,
      criticalIncidents: criticalIncidents || 0,
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      totalAlerts: totalAlerts || 0,
      newAlerts: newAlerts || 0
    };
  }
}

module.exports = new SupabaseService();
