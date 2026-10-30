-- Drop triggers
DROP TRIGGER IF EXISTS update_sla_states_updated_at ON sla_states;
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
DROP TRIGGER IF EXISTS update_ticket_custom_fields_updated_at ON ticket_custom_fields;
DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets;
DROP TRIGGER IF EXISTS update_custom_field_definitions_updated_at ON custom_field_definitions;
DROP TRIGGER IF EXISTS update_tags_updated_at ON tags;
DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
DROP TRIGGER IF EXISTS validate_message_author ON messages;

-- Drop audit triggers
DROP TRIGGER IF EXISTS audit_tickets ON tickets;
DROP TRIGGER IF EXISTS audit_messages ON messages;
DROP TRIGGER IF EXISTS audit_ticket_custom_fields ON ticket_custom_fields;
DROP TRIGGER IF EXISTS audit_ticket_tags ON ticket_tags;
DROP TRIGGER IF EXISTS audit_status_history ON status_history;
DROP TRIGGER IF EXISTS audit_sla_states ON sla_states;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS validate_message_author();
DROP FUNCTION IF EXISTS audit_log_changes();
DROP FUNCTION IF EXISTS cleanup_audit_logs();

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS sla_states;
DROP TABLE IF EXISTS status_history;
DROP TABLE IF EXISTS ticket_snapshots;
DROP TABLE IF EXISTS message_attachments;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS ticket_followers;
DROP TABLE IF EXISTS ticket_tags;
DROP TABLE IF EXISTS ticket_custom_fields;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS custom_field_definitions;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS agents;
DROP TABLE IF EXISTS customers;

-- Disable UUID extension if no other tables are using it
DROP EXTENSION IF EXISTS "uuid-ossp"; 