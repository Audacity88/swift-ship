-- Remove indexes, trigger, and function for audit_logs actor validation
DROP INDEX IF EXISTS idx_audit_logs_customer_actor;
DROP INDEX IF EXISTS idx_audit_logs_agent_actor;

DROP TRIGGER IF EXISTS validate_audit_log_actor ON audit_logs;
DROP FUNCTION IF EXISTS validate_audit_log_actor(); 