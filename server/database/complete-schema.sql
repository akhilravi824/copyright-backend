-- DSP Brand Protection Platform Database Schema for Supabase
-- Complete SQL script to set up the entire database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (replaces User model)
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
    
    -- Preferences (stored as JSONB)
    preferences JSONB DEFAULT '{
        "emailNotifications": true,
        "dashboardLayout": "default",
        "timezone": "America/Los_Angeles"
    }'::jsonb,
    
    -- Security fields
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    email_verification_token VARCHAR(255),
    email_verified BOOLEAN DEFAULT false,
    
    -- Invitation system
    invitation_token VARCHAR(255),
    invitation_expires TIMESTAMP WITH TIME ZONE,
    invited_by UUID REFERENCES users(id),
    invitation_status VARCHAR(20) DEFAULT 'pending' CHECK (invitation_status IN ('pending', 'accepted', 'expired')),
    
    -- Activity tracking
    login_attempts INTEGER DEFAULT 0,
    lock_until TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Incidents table (replaces Incident model)
CREATE TABLE incidents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    reporter_id UUID NOT NULL REFERENCES users(id),
    
    -- Incident details
    incident_type VARCHAR(50) NOT NULL CHECK (incident_type IN ('copyright_infringement', 'trademark_violation', 'impersonation', 'unauthorized_distribution', 'other')),
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'reported' CHECK (status IN ('reported', 'under_review', 'in_progress', 'resolved', 'closed', 'escalated')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Content information
    infringed_content TEXT NOT NULL,
    infringed_urls JSONB DEFAULT '[]'::jsonb, -- Array of {url, description, screenshot, verified}
    
    -- Infringer information
    infringer_info JSONB DEFAULT '{}'::jsonb, -- {name, email, website, socialMedia, contactInfo}
    
    -- Assignment and tracking
    assigned_to UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    
    -- Case management
    case_number VARCHAR(20) GENERATED ALWAYS AS ('DSP-' || UPPER(SUBSTRING(id::text FROM 25 FOR 8))) STORED,
    
    -- Additional data
    tags TEXT[] DEFAULT '{}',
    evidence_files JSONB DEFAULT '[]'::jsonb, -- Array of file references
    notes JSONB DEFAULT '[]'::jsonb, -- Array of {content, author_id, created_at}
    
    -- Timestamps
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table (replaces Document model)
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

-- Templates table (replaces Template model)
CREATE TABLE templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('dmca_notice', 'cease_desist', 'take_down_request', 'legal_letter', 'report')),
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb, -- Array of variable definitions
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monitoring alerts table (replaces MonitoringAlert model)
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

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department ON users(department);
CREATE INDEX idx_users_invitation_token ON users(invitation_token);
CREATE INDEX idx_users_invitation_status ON users(invitation_status);

CREATE INDEX idx_incidents_reporter ON incidents(reporter_id);
CREATE INDEX idx_incidents_assigned_to ON incidents(assigned_to);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_incident_type ON incidents(incident_type);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_priority ON incidents(priority);
CREATE INDEX idx_incidents_reported_at ON incidents(reported_at);
CREATE INDEX idx_incidents_case_number ON incidents(case_number);

CREATE INDEX idx_documents_incident_id ON documents(incident_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_document_type ON documents(document_type);

CREATE INDEX idx_templates_template_type ON templates(template_type);
CREATE INDEX idx_templates_is_active ON templates(is_active);

CREATE INDEX idx_monitoring_alerts_alert_type ON monitoring_alerts(alert_type);
CREATE INDEX idx_monitoring_alerts_status ON monitoring_alerts(status);
CREATE INDEX idx_monitoring_alerts_assigned_to ON monitoring_alerts(assigned_to);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_monitoring_alerts_updated_at BEFORE UPDATE ON monitoring_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for data security
-- Users policies
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all users" ON users FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Incidents policies
CREATE POLICY "Users can view assigned incidents" ON incidents FOR SELECT USING (
    reporter_id = auth.uid() OR 
    assigned_to = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'legal', 'manager'))
);

CREATE POLICY "Users can create incidents" ON incidents FOR INSERT WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can update own incidents" ON incidents FOR UPDATE USING (
    reporter_id = auth.uid() OR 
    assigned_to = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'legal', 'manager'))
);

-- Documents policies
CREATE POLICY "Users can view accessible documents" ON documents FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM incidents 
        WHERE incidents.id = documents.incident_id 
        AND (incidents.reporter_id = auth.uid() OR 
             incidents.assigned_to = auth.uid() OR
             EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'legal', 'manager')))
    )
);

CREATE POLICY "Users can create documents" ON documents FOR INSERT WITH CHECK (uploaded_by = auth.uid());

-- Templates policies
CREATE POLICY "Users can view active templates" ON templates FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can create templates" ON templates FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Monitoring alerts policies
CREATE POLICY "Authorized users can view alerts" ON monitoring_alerts FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'legal', 'manager', 'staff'))
);

-- Insert initial admin user (password: admin123)
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

-- Insert sample templates
INSERT INTO templates (name, description, template_type, content, variables, created_by) VALUES
(
    'DMCA Takedown Notice',
    'Standard DMCA takedown notice template',
    'dmca_notice',
    'Dear [RECIPIENT_NAME],

We are writing to notify you of copyright infringement under the Digital Millennium Copyright Act (DMCA).

**Infringing Content:**
- Title: [CONTENT_TITLE]
- URL: [INFRINGING_URL]
- Description: [CONTENT_DESCRIPTION]

**Our Copyrighted Work:**
- Title: [OUR_TITLE]
- Original URL: [ORIGINAL_URL]
- Copyright Owner: [COPYRIGHT_OWNER]

We request that you immediately remove the infringing content and cease any further distribution.

Sincerely,
[YOUR_NAME]
[YOUR_TITLE]
[COMPANY_NAME]',
    '["RECIPIENT_NAME", "CONTENT_TITLE", "INFRINGING_URL", "CONTENT_DESCRIPTION", "OUR_TITLE", "ORIGINAL_URL", "COPYRIGHT_OWNER", "YOUR_NAME", "YOUR_TITLE", "COMPANY_NAME"]'::jsonb,
    (SELECT id FROM users WHERE email = 'admin@dsp.com' LIMIT 1)
),
(
    'Cease and Desist Letter',
    'Legal cease and desist letter template',
    'cease_desist',
    'Dear [RECIPIENT_NAME],

This letter serves as formal notice to cease and desist from the unauthorized use of our intellectual property.

**Infringement Details:**
- Infringing Content: [INFRINGING_CONTENT]
- Location: [INFRINGING_URL]
- Date Discovered: [DISCOVERY_DATE]

**Our Rights:**
- Copyright/Trademark: [IP_RIGHTS]
- Registration Number: [REGISTRATION_NUMBER]

You are hereby directed to:
1. Immediately cease all unauthorized use
2. Remove all infringing content
3. Provide written confirmation of compliance within 10 days

Failure to comply may result in legal action.

Sincerely,
[ATTORNEY_NAME]
[LAW_FIRM_NAME]',
    '["RECIPIENT_NAME", "INFRINGING_CONTENT", "INFRINGING_URL", "DISCOVERY_DATE", "IP_RIGHTS", "REGISTRATION_NUMBER", "ATTORNEY_NAME", "LAW_FIRM_NAME"]'::jsonb,
    (SELECT id FROM users WHERE email = 'admin@dsp.com' LIMIT 1)
),
(
    'Incident Report Template',
    'Standard incident report template',
    'report',
    '# Incident Report

**Case Number:** [CASE_NUMBER]
**Date:** [REPORT_DATE]
**Reporter:** [REPORTER_NAME]

## Incident Details
- **Type:** [INCIDENT_TYPE]
- **Severity:** [SEVERITY]
- **Status:** [STATUS]

## Description
[INCIDENT_DESCRIPTION]

## Infringed Content
[INFRINGED_CONTENT]

## Infringing URLs
[INFRINGING_URLS]

## Infringer Information
[INFRINGER_INFO]

## Actions Taken
[ACTIONS_TAKEN]

## Next Steps
[NEXT_STEPS]

---
Reported by: [REPORTER_NAME]
Date: [REPORT_DATE]',
    '["CASE_NUMBER", "REPORT_DATE", "REPORTER_NAME", "INCIDENT_TYPE", "SEVERITY", "STATUS", "INCIDENT_DESCRIPTION", "INFRINGED_CONTENT", "INFRINGING_URLS", "INFRINGER_INFO", "ACTIONS_TAKEN", "NEXT_STEPS"]'::jsonb,
    (SELECT id FROM users WHERE email = 'admin@dsp.com' LIMIT 1)
);

-- Success message
SELECT 'DSP Brand Protection Platform database schema created successfully!' as message;
