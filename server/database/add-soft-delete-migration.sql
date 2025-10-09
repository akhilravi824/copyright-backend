-- =====================================================
-- SOFT DELETE MIGRATION FOR INCIDENTS TABLE
-- =====================================================
-- This migration adds soft delete functionality to the incidents table
-- allowing admins and managers to mark incidents as deleted without
-- permanently removing them from the database

-- Add soft delete columns
ALTER TABLE incidents
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS deleted_reason TEXT;

-- Add index for faster queries filtering out deleted incidents
CREATE INDEX IF NOT EXISTS idx_incidents_deleted_at ON incidents(deleted_at);

-- Add index for querying deleted incidents
CREATE INDEX IF NOT EXISTS idx_incidents_deleted_by ON incidents(deleted_by) WHERE deleted_at IS NOT NULL;

-- Update existing incidents to ensure they're not marked as deleted
UPDATE incidents 
SET deleted_at = NULL, deleted_by = NULL, deleted_reason = NULL 
WHERE deleted_at IS NOT NULL;

-- Add comment to document the soft delete behavior
COMMENT ON COLUMN incidents.deleted_at IS 'Timestamp when the incident was soft deleted. NULL means not deleted.';
COMMENT ON COLUMN incidents.deleted_by IS 'User ID who performed the soft delete operation.';
COMMENT ON COLUMN incidents.deleted_reason IS 'Optional reason for deleting the incident.';


