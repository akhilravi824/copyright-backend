-- =====================================================
-- USER INVITATIONS TABLE
-- Dedicated table for invitation management and audit trail
-- =====================================================

CREATE TABLE user_invitations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'staff' CHECK (role IN ('admin', 'legal', 'manager', 'staff', 'viewer', 'analyst')),
    department VARCHAR(50) CHECK (department IN ('legal', 'marketing', 'crr', 'management', 'it')),
    job_title VARCHAR(255),
    
    -- Invitation metadata
    invitation_token VARCHAR(255) UNIQUE NOT NULL,
    invitation_status VARCHAR(20) DEFAULT 'pending' CHECK (invitation_status IN ('pending', 'accepted', 'expired', 'revoked')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    
    -- Invitation tracking
    invited_by UUID NOT NULL REFERENCES users(id),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES users(id),
    
    -- Supabase Auth integration
    supabase_user_id UUID, -- Reference to auth.users.id when created
    supabase_invite_id VARCHAR(255), -- Supabase invitation ID for tracking
    
    -- Email delivery tracking
    email_sent_at TIMESTAMP WITH TIME ZONE,
    email_delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (email_delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    email_error_message TEXT,
    
    -- Resend tracking
    resend_count INTEGER DEFAULT 0,
    last_resend_at TIMESTAMP WITH TIME ZONE,
    
    -- Custom invitation message
    custom_message TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_pending_email UNIQUE (email, invitation_status) DEFERRABLE INITIALLY DEFERRED
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_user_invitations_email ON user_invitations(email);
CREATE INDEX idx_user_invitations_token ON user_invitations(invitation_token);
CREATE INDEX idx_user_invitations_status ON user_invitations(invitation_status);
CREATE INDEX idx_user_invitations_invited_by ON user_invitations(invited_by);
CREATE INDEX idx_user_invitations_expires_at ON user_invitations(expires_at);
CREATE INDEX idx_user_invitations_created_at ON user_invitations(created_at);
CREATE INDEX idx_user_invitations_supabase_user_id ON user_invitations(supabase_user_id);

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_invitation_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to automatically expire invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS TRIGGER AS $$
BEGIN
    -- Expire invitations that are past their expiration date
    UPDATE user_invitations 
    SET invitation_status = 'expired', updated_at = NOW()
    WHERE invitation_status = 'pending' 
    AND expires_at < NOW();
    
    RETURN NULL;
END;
$$ language 'plpgsql';

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Updated_at trigger
CREATE TRIGGER update_user_invitations_updated_at 
    BEFORE UPDATE ON user_invitations 
    FOR EACH ROW EXECUTE FUNCTION update_invitation_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all invitations" ON user_invitations FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Managers can view invitations" ON user_invitations FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to create invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ language 'plpgsql';

-- Function to check if invitation is valid
CREATE OR REPLACE FUNCTION is_invitation_valid(invitation_token_param TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_invitations 
        WHERE invitation_token = invitation_token_param 
        AND invitation_status = 'pending' 
        AND expires_at > NOW()
    );
END;
$$ language 'plpgsql';

-- Function to get invitation by token
CREATE OR REPLACE FUNCTION get_invitation_by_token(invitation_token_param TEXT)
RETURNS TABLE (
    id UUID,
    email VARCHAR,
    role VARCHAR,
    department VARCHAR,
    job_title VARCHAR,
    invited_by UUID,
    invited_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    custom_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ui.id,
        ui.email,
        ui.role,
        ui.department,
        ui.job_title,
        ui.invited_by,
        ui.invited_at,
        ui.expires_at,
        ui.custom_message
    FROM user_invitations ui
    WHERE ui.invitation_token = invitation_token_param 
    AND ui.invitation_status = 'pending' 
    AND ui.expires_at > NOW();
END;
$$ language 'plpgsql';

-- =====================================================
-- INITIAL DATA (Optional)
-- =====================================================

-- Insert invitation settings into system_settings
INSERT INTO system_settings (key, value, description, category, is_public) VALUES
('invitation_expiry_hours', '24', 'Hours until invitation expires', 'invitations', false),
('max_resend_attempts', '3', 'Maximum resend attempts per invitation', 'invitations', false),
('invitation_email_template', 'default', 'Email template for invitations', 'invitations', false),
('allowed_invitation_domains', '[]', 'Allowed email domains for invitations (empty = all)', 'invitations', false)
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT 'User invitations table created successfully!' as message,
       'All indexes, triggers, and policies have been created.' as details,
       'Ready for invitation system implementation.' as status;
