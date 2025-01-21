-- Drop triggers and functions
DROP TRIGGER IF EXISTS ensure_ticket_metadata_object ON tickets;
DROP FUNCTION IF EXISTS ensure_ticket_metadata_object();

-- Drop indexes
DROP INDEX IF EXISTS idx_tickets_resolved_at;
DROP INDEX IF EXISTS idx_tickets_metadata_gin;

-- Remove columns
ALTER TABLE tickets
DROP COLUMN IF EXISTS metadata,
DROP COLUMN IF EXISTS resolved_at;