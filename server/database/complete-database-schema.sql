-- =====================================================
-- DSP Brand Protection Platform - Complete Database Schema
-- Supabase PostgreSQL Database Setup
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- USERS TABLE
-- =====================================================
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
    
    -- User preferences (JSONB for flexibility)
    preferences JSONB DEFAULT '{
        "emailNotifications": true,
        "dashboardLayout": "default",
        "timezone": "America/Los_Angeles",
        "theme": "light",
        "language": "en"
    }'::jsonb,
    
    -- Security and authentication fields
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    email_verification_token VARCHAR(255),
    email_verified BOOLEAN DEFAULT false,
    
    -- Invitation system for user management
    invitation_token VARCHAR(255),
    invitation_expires TIMESTAMP WITH TIME ZONE,
    invited_by UUID REFERENCES users(id),
    invitation_status VARCHAR(20) DEFAULT 'pending' CHECK (invitation_status IN ('pending', 'accepted', 'expired')),
    
    -- Account security and activity tracking
    login_attempts INTEGER DEFAULT 0,
    lock_until TIMESTAMP WITH TIME ZONE,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(255),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- =====================================================
-- INCIDENTS TABLE (Main case management)
-- =====================================================
CREATE TABLE incidents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    reporter_id UUID NOT NULL REFERENCES users(id),
    
    -- Incident classification
    incident_type VARCHAR(50) NOT NULL CHECK (incident_type IN (
        'copyright_infringement', 
        'trademark_violation', 
        'impersonation', 
        'unauthorized_distribution', 
        'patent_infringement',
        'trade_secret_violation',
        'other'
    )),
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'reported' CHECK (status IN (
        'reported', 
        'under_review', 
        'in_progress', 
        'resolved', 
        'closed', 
        'escalated',
        'dismissed'
    )),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Content information
    infringed_content TEXT NOT NULL,
    infringed_urls JSONB DEFAULT '[]'::jsonb, -- Array of {url, description, screenshot, verified, date_found}
    original_content_url TEXT,
    content_type VARCHAR(50), -- 'text', 'image', 'video', 'audio', 'software', 'other'
    
    -- Infringer information
    infringer_info JSONB DEFAULT '{}'::jsonb, -- {name, email, website, socialMedia, contactInfo, location}
    infringer_type VARCHAR(50), -- 'individual', 'company', 'organization', 'unknown'
    
    -- Assignment and workflow
    assigned_to UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    estimated_resolution_date TIMESTAMP WITH TIME ZONE,
    
    -- Case management
    case_number VARCHAR(20) GENERATED ALWAYS AS ('DSP-' || UPPER(SUBSTRING(id::text FROM 25 FOR 8))) STORED,
    external_case_id VARCHAR(100), -- For integration with external systems
    
    -- Additional metadata
    tags TEXT[] DEFAULT '{}',
    evidence_files JSONB DEFAULT '[]'::jsonb, -- Array of file references
    notes JSONB DEFAULT '[]'::jsonb, -- Array of {content, author_id, created_at, type}
    attachments JSONB DEFAULT '[]'::jsonb, -- Array of attachment metadata
    
    -- Legal and compliance
    legal_action_taken JSONB DEFAULT '[]'::jsonb, -- Array of legal actions
    compliance_status VARCHAR(50), -- 'compliant', 'non_compliant', 'under_investigation'
    regulatory_requirements TEXT[],
    
    -- Financial impact
    estimated_damages DECIMAL(15,2),
    actual_costs DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Timestamps
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- =====================================================
-- DOCUMENTS TABLE
-- =====================================================
CREATE TABLE documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(100),
    mime_type VARCHAR(100),
    document_type VARCHAR(50) CHECK (document_type IN (
        'evidence', 
        'legal_document', 
        'correspondence', 
        'report', 
        'screenshot',
        'video',
        'audio',
        'other'
    )),
    uploaded_by UUID NOT NULL REFERENCES users(id),
    
    -- Document metadata
    document_status VARCHAR(20) DEFAULT 'active' CHECK (document_status IN ('active', 'archived', 'deleted')),
    confidentiality_level VARCHAR(20) DEFAULT 'internal' CHECK (confidentiality_level IN ('public', 'internal', 'confidential', 'restricted')),
    version VARCHAR(20) DEFAULT '1.0',
    checksum VARCHAR(255), -- For file integrity verification
    
    -- Document content analysis
    extracted_text TEXT, -- OCR or text extraction
    keywords TEXT[],
    language VARCHAR(10) DEFAULT 'en',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- =====================================================
-- TEMPLATES TABLE
-- =====================================================
CREATE TABLE templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_type VARCHAR(50) NOT NULL CHECK (template_type IN (
        'dmca_notice', 
        'cease_desist', 
        'take_down_request', 
        'legal_letter', 
        'report',
        'correspondence',
        'contract',
        'agreement'
    )),
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb, -- Array of variable definitions
    is_active BOOLEAN DEFAULT true,
    version VARCHAR(20) DEFAULT '1.0',
    
    -- Template metadata
    category VARCHAR(50), -- 'legal', 'correspondence', 'report', 'other'
    language VARCHAR(10) DEFAULT 'en',
    jurisdiction VARCHAR(100), -- Legal jurisdiction
    applicable_laws TEXT[], -- Array of applicable laws
    
    -- Access control
    created_by UUID NOT NULL REFERENCES users(id),
    shared_with_roles TEXT[] DEFAULT '{}', -- Roles that can use this template
    is_public BOOLEAN DEFAULT false,
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by_user UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- =====================================================
-- MONITORING ALERTS TABLE
-- =====================================================
CREATE TABLE monitoring_alerts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
        'google_alerts', 
        'brand_mentions', 
        'web_scraping', 
        'social_media',
        'domain_monitoring',
        'manual',
        'api_integration'
    )),
    source VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    url TEXT,
    content TEXT,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN (
        'new', 
        'reviewed', 
        'investigating', 
        'resolved', 
        'dismissed',
        'escalated'
    )),
    
    -- Assignment and workflow
    assigned_to UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE,
    incident_id UUID REFERENCES incidents(id),
    
    -- Alert metadata
    metadata JSONB DEFAULT '{}'::jsonb, -- Source-specific data
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    false_positive BOOLEAN DEFAULT false,
    
    -- Content analysis
    detected_brands TEXT[],
    detected_keywords TEXT[],
    content_language VARCHAR(10),
    content_category VARCHAR(50),
    
    -- Geographic and temporal data
    detected_location VARCHAR(100),
    detected_country VARCHAR(2), -- ISO country code
    timezone VARCHAR(50),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- =====================================================
-- CASE ACTIVITIES TABLE (Audit trail)
-- =====================================================
CREATE TABLE case_activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
        'created',
        'updated',
        'assigned',
        'status_changed',
        'comment_added',
        'document_uploaded',
        'template_used',
        'legal_action_taken',
        'resolved',
        'closed'
    )),
    description TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
    category VARCHAR(50) CHECK (category IN ('incident', 'assignment', 'deadline', 'system', 'legal')),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Related entities
    incident_id UUID REFERENCES incidents(id),
    document_id UUID REFERENCES documents(id),
    
    -- Notification metadata
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    expires_at TIMESTAMP WITH TIME ZONE,
    action_url TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SYSTEM SETTINGS TABLE
-- =====================================================
CREATE TABLE system_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    is_public BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department ON users(department);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_invitation_token ON users(invitation_token);
CREATE INDEX idx_users_invitation_status ON users(invitation_status);
CREATE INDEX idx_users_last_login ON users(last_login);

-- Incidents indexes
CREATE INDEX idx_incidents_reporter ON incidents(reporter_id);
CREATE INDEX idx_incidents_assigned_to ON incidents(assigned_to);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_incident_type ON incidents(incident_type);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_priority ON incidents(priority);
CREATE INDEX idx_incidents_reported_at ON incidents(reported_at);
CREATE INDEX idx_incidents_case_number ON incidents(case_number);
CREATE INDEX idx_incidents_due_date ON incidents(due_date);
CREATE INDEX idx_incidents_tags ON incidents USING GIN(tags);
CREATE INDEX idx_incidents_created_at ON incidents(created_at);

-- Documents indexes
CREATE INDEX idx_documents_incident_id ON documents(incident_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_document_type ON documents(document_type);
CREATE INDEX idx_documents_status ON documents(document_status);
CREATE INDEX idx_documents_created_at ON documents(created_at);

-- Templates indexes
CREATE INDEX idx_templates_template_type ON templates(template_type);
CREATE INDEX idx_templates_is_active ON templates(is_active);
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_created_by ON templates(created_by);

-- Monitoring alerts indexes
CREATE INDEX idx_monitoring_alerts_alert_type ON monitoring_alerts(alert_type);
CREATE INDEX idx_monitoring_alerts_status ON monitoring_alerts(status);
CREATE INDEX idx_monitoring_alerts_assigned_to ON monitoring_alerts(assigned_to);
CREATE INDEX idx_monitoring_alerts_incident_id ON monitoring_alerts(incident_id);
CREATE INDEX idx_monitoring_alerts_created_at ON monitoring_alerts(created_at);
CREATE INDEX idx_monitoring_alerts_severity ON monitoring_alerts(severity);

-- Case activities indexes
CREATE INDEX idx_case_activities_incident_id ON case_activities(incident_id);
CREATE INDEX idx_case_activities_user_id ON case_activities(user_id);
CREATE INDEX idx_case_activities_type ON case_activities(activity_type);
CREATE INDEX idx_case_activities_created_at ON case_activities(created_at);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- System settings indexes
CREATE INDEX idx_system_settings_key ON system_settings(key);
CREATE INDEX idx_system_settings_category ON system_settings(category);

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to log case activities
CREATE OR REPLACE FUNCTION log_case_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO case_activities (incident_id, user_id, activity_type, description, new_values)
        VALUES (NEW.id, NEW.created_by, 'created', 'Incident created', row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO case_activities (incident_id, user_id, activity_type, description, old_values, new_values)
        VALUES (NEW.id, NEW.updated_by, 'updated', 'Incident updated', row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_monitoring_alerts_updated_at BEFORE UPDATE ON monitoring_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Case activity logging triggers
CREATE TRIGGER log_incident_activity AFTER INSERT OR UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION log_case_activity();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Users policies
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can manage all users" ON users FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Managers can view team users" ON users FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- Incidents policies
CREATE POLICY "Users can view assigned incidents" ON incidents FOR SELECT USING (
    reporter_id = auth.uid() OR 
    assigned_to = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'legal', 'manager'))
);

CREATE POLICY "Users can create incidents" ON incidents FOR INSERT WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can update assigned incidents" ON incidents FOR UPDATE USING (
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
CREATE POLICY "Users can view active templates" ON templates FOR SELECT USING (
    is_active = true AND (is_public = true OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = ANY(shared_with_roles)))
);

CREATE POLICY "Admins can manage templates" ON templates FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Monitoring alerts policies
CREATE POLICY "Authorized users can view alerts" ON monitoring_alerts FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'legal', 'manager', 'staff'))
);

-- Case activities policies
CREATE POLICY "Users can view incident activities" ON case_activities FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM incidents 
        WHERE incidents.id = case_activities.incident_id 
        AND (incidents.reporter_id = auth.uid() OR 
             incidents.assigned_to = auth.uid() OR
             EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'legal', 'manager')))
    )
);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- System settings policies
CREATE POLICY "Public settings are viewable" ON system_settings FOR SELECT USING (is_public = true);
CREATE POLICY "Admins can manage settings" ON system_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- =====================================================
-- INITIAL DATA INSERTION
-- =====================================================

-- Insert initial admin user (password: admin123)
INSERT INTO users (
    first_name, 
    last_name, 
    email, 
    password_hash, 
    role, 
    department, 
    is_active,
    email_verified,
    preferences
) VALUES (
    'Admin',
    'User', 
    'admin@dsp.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'admin',
    'management',
    true,
    true,
    '{
        "emailNotifications": true,
        "dashboardLayout": "default",
        "timezone": "America/Los_Angeles",
        "theme": "light",
        "language": "en"
    }'::jsonb
) ON CONFLICT (email) DO NOTHING;

-- Insert sample templates
INSERT INTO templates (name, description, template_type, content, variables, created_by, category) VALUES
(
    'DMCA Takedown Notice',
    'Standard DMCA takedown notice template for copyright infringement cases',
    'dmca_notice',
    'Dear [RECIPIENT_NAME],

We are writing to notify you of copyright infringement under the Digital Millennium Copyright Act (DMCA).

**Infringing Content:**
- Title: [CONTENT_TITLE]
- URL: [INFRINGING_URL]
- Description: [CONTENT_DESCRIPTION]
- Date Discovered: [DISCOVERY_DATE]

**Our Copyrighted Work:**
- Title: [OUR_TITLE]
- Original URL: [ORIGINAL_URL]
- Copyright Owner: [COPYRIGHT_OWNER]
- Registration Number: [REGISTRATION_NUMBER]

**Legal Notice:**
We request that you immediately remove the infringing content and cease any further distribution. This notice is provided in good faith and under penalty of perjury.

**Contact Information:**
- Name: [YOUR_NAME]
- Title: [YOUR_TITLE]
- Company: [COMPANY_NAME]
- Email: [YOUR_EMAIL]
- Phone: [YOUR_PHONE]

Sincerely,
[YOUR_NAME]
[YOUR_TITLE]
[COMPANY_NAME]',
    '["RECIPIENT_NAME", "CONTENT_TITLE", "INFRINGING_URL", "CONTENT_DESCRIPTION", "DISCOVERY_DATE", "OUR_TITLE", "ORIGINAL_URL", "COPYRIGHT_OWNER", "REGISTRATION_NUMBER", "YOUR_NAME", "YOUR_TITLE", "COMPANY_NAME", "YOUR_EMAIL", "YOUR_PHONE"]'::jsonb,
    (SELECT id FROM users WHERE email = 'admin@dsp.com' LIMIT 1),
    'legal'
),
(
    'Cease and Desist Letter',
    'Legal cease and desist letter template for trademark and copyright violations',
    'cease_desist',
    'Dear [RECIPIENT_NAME],

This letter serves as formal notice to cease and desist from the unauthorized use of our intellectual property.

**Infringement Details:**
- Infringing Content: [INFRINGING_CONTENT]
- Location: [INFRINGING_URL]
- Date Discovered: [DISCOVERY_DATE]
- Infringement Type: [INFRINGEMENT_TYPE]

**Our Rights:**
- Copyright/Trademark: [IP_RIGHTS]
- Registration Number: [REGISTRATION_NUMBER]
- Registration Date: [REGISTRATION_DATE]
- Jurisdiction: [JURISDICTION]

**Legal Demands:**
You are hereby directed to:
1. Immediately cease all unauthorized use of our intellectual property
2. Remove all infringing content within 10 business days
3. Provide written confirmation of compliance
4. Cease any future unauthorized use

**Consequences:**
Failure to comply with this demand may result in legal action seeking injunctive relief, monetary damages, and attorney fees.

**Contact Information:**
- Attorney: [ATTORNEY_NAME]
- Law Firm: [LAW_FIRM_NAME]
- Address: [LAW_FIRM_ADDRESS]
- Email: [ATTORNEY_EMAIL]
- Phone: [ATTORNEY_PHONE]

Sincerely,
[ATTORNEY_NAME]
[LAW_FIRM_NAME]',
    '["RECIPIENT_NAME", "INFRINGING_CONTENT", "INFRINGING_URL", "DISCOVERY_DATE", "INFRINGEMENT_TYPE", "IP_RIGHTS", "REGISTRATION_NUMBER", "REGISTRATION_DATE", "JURISDICTION", "ATTORNEY_NAME", "LAW_FIRM_NAME", "LAW_FIRM_ADDRESS", "ATTORNEY_EMAIL", "ATTORNEY_PHONE"]'::jsonb,
    (SELECT id FROM users WHERE email = 'admin@dsp.com' LIMIT 1),
    'legal'
),
(
    'Incident Report Template',
    'Comprehensive incident report template for documenting IP violations',
    'report',
    '# Incident Report

**Case Information:**
- Case Number: [CASE_NUMBER]
- Report Date: [REPORT_DATE]
- Reporter: [REPORTER_NAME]
- Reporter Email: [REPORTER_EMAIL]
- Reporter Phone: [REPORTER_PHONE]

## Incident Details
- **Type:** [INCIDENT_TYPE]
- **Severity:** [SEVERITY]
- **Status:** [STATUS]
- **Priority:** [PRIORITY]
- **Date Discovered:** [DISCOVERY_DATE]
- **Date Reported:** [REPORT_DATE]

## Description
[INCIDENT_DESCRIPTION]

## Infringed Content
[INFRINGED_CONTENT]

## Infringing URLs
[INFRINGING_URLS]

## Infringer Information
[INFRINGER_INFO]

## Evidence Collected
[EVIDENCE_COLLECTED]

## Legal Actions Taken
[LEGAL_ACTIONS_TAKEN]

## Timeline of Events
[TIMELINE_EVENTS]

## Impact Assessment
[IMPACT_ASSESSMENT]

## Next Steps
[NEXT_STEPS]

## Recommendations
[RECOMMENDATIONS]

---
**Report Prepared By:** [REPORTER_NAME]
**Date:** [REPORT_DATE]
**Classification:** [CLASSIFICATION]',
    '["CASE_NUMBER", "REPORT_DATE", "REPORTER_NAME", "REPORTER_EMAIL", "REPORTER_PHONE", "INCIDENT_TYPE", "SEVERITY", "STATUS", "PRIORITY", "DISCOVERY_DATE", "INCIDENT_DESCRIPTION", "INFRINGED_CONTENT", "INFRINGING_URLS", "INFRINGER_INFO", "EVIDENCE_COLLECTED", "LEGAL_ACTIONS_TAKEN", "TIMELINE_EVENTS", "IMPACT_ASSESSMENT", "NEXT_STEPS", "RECOMMENDATIONS", "CLASSIFICATION"]'::jsonb,
    (SELECT id FROM users WHERE email = 'admin@dsp.com' LIMIT 1),
    'report'
),
(
    'Legal Correspondence Template',
    'General legal correspondence template for various IP-related communications',
    'legal_letter',
    '[COMPANY_HEADER]

[RECIPIENT_NAME]
[RECIPIENT_ADDRESS]

Re: [SUBJECT_LINE]

Dear [RECIPIENT_NAME],

I am writing on behalf of [CLIENT_NAME] regarding [SUBJECT_MATTER].

**Background:**
[BACKGROUND_INFORMATION]

**Legal Position:**
[LEGAL_POSITION]

**Demands:**
[DEMANDS]

**Deadline:**
[DEADLINE]

**Consequences:**
[CONSEQUENCES]

Please contact me at [ATTORNEY_CONTACT] to discuss this matter further.

Sincerely,
[ATTORNEY_NAME]
[ATTORNEY_TITLE]
[LAW_FIRM_NAME]',
    '["COMPANY_HEADER", "RECIPIENT_NAME", "RECIPIENT_ADDRESS", "SUBJECT_LINE", "CLIENT_NAME", "SUBJECT_MATTER", "BACKGROUND_INFORMATION", "LEGAL_POSITION", "DEMANDS", "DEADLINE", "CONSEQUENCES", "ATTORNEY_CONTACT", "ATTORNEY_NAME", "ATTORNEY_TITLE", "LAW_FIRM_NAME"]'::jsonb,
    (SELECT id FROM users WHERE email = 'admin@dsp.com' LIMIT 1),
    'legal'
);

-- Insert initial system settings
INSERT INTO system_settings (key, value, description, category, is_public) VALUES
('app_name', '"DSP Brand Protection Platform"', 'Application name', 'general', true),
('app_version', '"1.0.0"', 'Application version', 'general', true),
('max_file_size', '10485760', 'Maximum file upload size in bytes (10MB)', 'uploads', false),
('allowed_file_types', '["pdf", "doc", "docx", "txt", "jpg", "jpeg", "png", "gif", "mp4", "mp3"]', 'Allowed file types for uploads', 'uploads', false),
('email_notifications_enabled', 'true', 'Enable email notifications', 'notifications', false),
('auto_assignment_enabled', 'false', 'Enable automatic case assignment', 'workflow', false),
('default_case_priority', '"normal"', 'Default priority for new cases', 'workflow', false),
('case_escalation_days', '7', 'Days before case escalation', 'workflow', false),
('data_retention_days', '2555', 'Days to retain case data (7 years)', 'compliance', false),
('backup_frequency', '"daily"', 'Database backup frequency', 'system', false);

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT 'DSP Brand Protection Platform database schema created successfully!' as message,
       'All tables, indexes, triggers, and policies have been created.' as details,
       'Ready for data migration and application deployment.' as status;
