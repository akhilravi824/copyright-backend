-- DSP Brand Protection Platform - Essential Tables Only
-- Simple table creation for Supabase

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
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

-- Incidents table
CREATE TABLE incidents (
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

-- Documents table
CREATE TABLE documents (
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

-- Templates table
CREATE TABLE templates (
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

-- Monitoring alerts table
CREATE TABLE monitoring_alerts (
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

-- Create basic indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_incidents_reporter ON incidents(reporter_id);
CREATE INDEX idx_incidents_assigned_to ON incidents(assigned_to);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_case_number ON incidents(case_number);
CREATE INDEX idx_documents_incident_id ON documents(incident_id);
CREATE INDEX idx_templates_template_type ON templates(template_type);

-- Insert admin user (password: admin123)
INSERT INTO users (
    first_name, 
    last_name, 
    email, 
    password_hash, 
    role, 
    department, 
    is_active,
    email_verified
) VALUES (
    'Admin',
    'User', 
    'admin@dsp.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'admin',
    'management',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- Success message
SELECT 'DSP Brand Protection Platform tables created successfully!' as message;
