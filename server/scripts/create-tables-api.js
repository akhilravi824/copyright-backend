const axios = require('axios');
require('dotenv').config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function createTablesViaAPI() {
  try {
    console.log('🚀 Creating Supabase tables via API...');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('❌ Missing Supabase credentials in .env file');
      console.log('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY');
      return false;
    }
    
    const headers = {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    };
    
    // Enable uuid-ossp extension
    console.log('🔧 Enabling uuid-ossp extension...');
    await axios.post(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
      sql: 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
    }, { headers });
    
    // Create users table
    console.log('👥 Creating users table...');
    await axios.post(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          first_name VARCHAR(255) NOT NULL,
          last_name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255),
          role VARCHAR(50) DEFAULT 'staff' CHECK (role IN ('admin', 'legal', 'manager', 'staff', 'viewer')),
          department VARCHAR(50) NOT NULL CHECK (department IN ('legal', 'marketing', 'crr', 'management', 'it')),
          phone VARCHAR(20),
          job_title VARCHAR(255),
          avatar TEXT,
          is_active BOOLEAN DEFAULT true,
          last_login TIMESTAMP WITH TIME ZONE,
          preferences JSONB DEFAULT '{"emailNotifications": true, "dashboardLayout": "default", "timezone": "America/Los_Angeles"}'::jsonb,
          password_reset_token VARCHAR(255),
          password_reset_expires TIMESTAMP WITH TIME ZONE,
          email_verification_token VARCHAR(255),
          email_verified BOOLEAN DEFAULT false,
          invitation_token VARCHAR(255),
          invitation_expires TIMESTAMP WITH TIME ZONE,
          invited_by UUID REFERENCES users(id),
          invitation_status VARCHAR(20) DEFAULT 'pending' CHECK (invitation_status IN ('pending', 'accepted', 'expired')),
          login_attempts INTEGER DEFAULT 0,
          lock_until TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    }, { headers });
    
    // Create incidents table
    console.log('📋 Creating incidents table...');
    await axios.post(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
      sql: `
        CREATE TABLE IF NOT EXISTS incidents (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          title VARCHAR(500) NOT NULL,
          description TEXT NOT NULL,
          reporter_id UUID NOT NULL REFERENCES users(id),
          incident_type VARCHAR(50) NOT NULL CHECK (incident_type IN ('copyright_infringement', 'trademark_violation', 'impersonation', 'unauthorized_distribution', 'other')),
          severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
          status VARCHAR(20) DEFAULT 'reported' CHECK (status IN ('reported', 'under_review', 'in_progress', 'resolved', 'closed', 'escalated')),
          priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
          infringed_content TEXT NOT NULL,
          infringed_urls JSONB DEFAULT '[]'::jsonb,
          infringer_info JSONB DEFAULT '{}'::jsonb,
          assigned_to UUID REFERENCES users(id),
          assigned_at TIMESTAMP WITH TIME ZONE,
          due_date TIMESTAMP WITH TIME ZONE,
          case_number VARCHAR(20) GENERATED ALWAYS AS ('DSP-' || UPPER(SUBSTRING(id::text FROM 25 FOR 8))) STORED,
          tags TEXT[] DEFAULT '{}',
          evidence_files JSONB DEFAULT '[]'::jsonb,
          notes JSONB DEFAULT '[]'::jsonb,
          reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          resolved_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    }, { headers });
    
    // Create documents table
    console.log('📄 Creating documents table...');
    await axios.post(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
      sql: `
        CREATE TABLE IF NOT EXISTS documents (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          file_path VARCHAR(500) NOT NULL,
          file_name VARCHAR(255) NOT NULL,
          file_size INTEGER,
          file_type VARCHAR(100),
          document_type VARCHAR(50) CHECK (document_type IN ('evidence', 'legal_document', 'correspondence', 'report', 'other')),
          uploaded_by UUID NOT NULL REFERENCES users(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    }, { headers });
    
    // Create templates table
    console.log('📝 Creating templates table...');
    await axios.post(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
      sql: `
        CREATE TABLE IF NOT EXISTS templates (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('dmca_notice', 'cease_desist', 'take_down_request', 'legal_letter', 'report')),
          content TEXT NOT NULL,
          variables JSONB DEFAULT '[]'::jsonb,
          is_active BOOLEAN DEFAULT true,
          created_by UUID NOT NULL REFERENCES users(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    }, { headers });
    
    // Create monitoring_alerts table
    console.log('🔔 Creating monitoring_alerts table...');
    await axios.post(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
      sql: `
        CREATE TABLE IF NOT EXISTS monitoring_alerts (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('google_alerts', 'brand_mentions', 'web_scraping', 'manual')),
          source VARCHAR(255) NOT NULL,
          title VARCHAR(500) NOT NULL,
          description TEXT,
          url TEXT,
          content TEXT,
          severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
          status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'investigating', 'resolved', 'dismissed')),
          assigned_to UUID REFERENCES users(id),
          incident_id UUID REFERENCES incidents(id),
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    }, { headers });
    
    // Create indexes
    console.log('📊 Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);',
      'CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);',
      'CREATE INDEX IF NOT EXISTS idx_incidents_reporter ON incidents(reporter_id);',
      'CREATE INDEX IF NOT EXISTS idx_incidents_assigned_to ON incidents(assigned_to);',
      'CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);',
      'CREATE INDEX IF NOT EXISTS idx_incidents_case_number ON incidents(case_number);'
    ];
    
    for (const indexSQL of indexes) {
      await axios.post(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
        sql: indexSQL
      }, { headers });
    }
    
    // Create triggers
    console.log('⚡ Creating triggers...');
    await axios.post(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
      sql: `
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
      `
    }, { headers });
    
    const triggers = [
      'CREATE TRIGGER IF NOT EXISTS update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      'CREATE TRIGGER IF NOT EXISTS update_incidents_updated_at BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      'CREATE TRIGGER IF NOT EXISTS update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      'CREATE TRIGGER IF NOT EXISTS update_templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      'CREATE TRIGGER IF NOT EXISTS update_monitoring_alerts_updated_at BEFORE UPDATE ON monitoring_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();'
    ];
    
    for (const triggerSQL of triggers) {
      await axios.post(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
        sql: triggerSQL
      }, { headers });
    }
    
    // Insert admin user
    console.log('👤 Inserting admin user...');
    await axios.post(`${SUPABASE_URL}/rest/v1/users`, {
      first_name: 'Admin',
      last_name: 'User',
      email: 'admin@dsp.com',
      password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // admin123
      role: 'admin',
      department: 'management',
      is_active: true,
      email_verified: true
    }, { 
      headers: {
        ...headers,
        'Prefer': 'resolution=ignore-duplicates'
      }
    });
    
    console.log('🎉 All tables created successfully via API!');
    return true;
    
  } catch (error) {
    console.error('❌ API table creation failed:', error.response?.data || error.message);
    return false;
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  createTablesViaAPI()
    .then((success) => {
      if (success) {
        console.log('🎉 Database setup completed via API!');
        process.exit(0);
      } else {
        console.log('💥 Setup failed!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('💥 Setup error:', error);
      process.exit(1);
    });
}

module.exports = createTablesViaAPI;
