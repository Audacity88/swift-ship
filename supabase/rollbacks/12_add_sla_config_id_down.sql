-- Drop RLS policies
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON sla_configs;
DROP POLICY IF EXISTS "Allow all access to admins" ON sla_configs;
DROP POLICY IF EXISTS "Allow read access to ticket assignees and admins" ON sla_status;
DROP POLICY IF EXISTS "Allow update access to ticket assignees and admins" ON sla_status;

-- Drop triggers
DROP TRIGGER IF EXISTS initialize_ticket_sla ON tickets;
DROP TRIGGER IF EXISTS update_sla_configs_updated_at ON sla_configs;
DROP TRIGGER IF EXISTS update_sla_status_updated_at ON sla_status;

-- Drop functions
DROP FUNCTION IF EXISTS initialize_sla_tracking();
DROP FUNCTION IF EXISTS calculate_sla_deadlines(TIMESTAMPTZ, INTEGER, INTEGER, JSONB, TEXT);

-- Drop indexes
DROP INDEX IF EXISTS idx_sla_status_ticket_id;
DROP INDEX IF EXISTS idx_tickets_sla_config_id;

-- Drop SLA status table and references
DROP TABLE IF EXISTS sla_status;

-- Remove SLA config reference from tickets
ALTER TABLE tickets DROP COLUMN IF EXISTS sla_config_id;

-- Drop SLA configs table
DROP TABLE IF EXISTS sla_configs;
