-- =====================================================
-- ADD ANALYST ROLE AND CREATE TEST USER
-- =====================================================

-- Step 1: Drop the existing CHECK constraint on role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 2: Add new CHECK constraint with 'analyst' role
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'legal', 'manager', 'staff', 'viewer', 'analyst'));

-- Step 3: Create a test analyst user
-- Password: analyst123 (you should hash this in production)
INSERT INTO users (
  first_name,
  last_name,
  email,
  password,
  role,
  department,
  phone,
  job_title,
  is_active,
  email_verified,
  created_at,
  updated_at
) VALUES (
  'Sarah',
  'Analyst',
  'analyst@dsp.com',
  'analyst123',
  'analyst',
  'legal',
  '+1-555-0103',
  'Content Analyst',
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  role = 'analyst',
  first_name = 'Sarah',
  last_name = 'Analyst',
  job_title = 'Content Analyst',
  updated_at = NOW();

-- Step 4: Comment to document the analyst role
COMMENT ON COLUMN users.role IS 'User role: admin (full access), legal (legal operations), manager (team management), staff (general staff), viewer (read-only), analyst (limited access - own incidents only)';

-- Verify the changes
SELECT id, first_name, last_name, email, role, department, is_active
FROM users
WHERE email = 'analyst@dsp.com';

