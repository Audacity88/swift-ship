-- Create function to validate audit log actor references
CREATE OR REPLACE FUNCTION validate_audit_log_actor()
RETURNS TRIGGER AS $$
BEGIN
  -- For agent actors
  IF NEW.actor_type = 'agent' THEN
    IF NOT EXISTS (SELECT 1 FROM agents WHERE id = NEW.actor_id) THEN
      RAISE EXCEPTION 'Invalid agent ID for actor_id';
    END IF;
  -- For customer actors
  ELSIF NEW.actor_type = 'customer' THEN
    IF NOT EXISTS (SELECT 1 FROM customers WHERE id = NEW.actor_id) THEN
      RAISE EXCEPTION 'Invalid customer ID for actor_id';
    END IF;
  -- For system actors, no validation needed
  ELSIF NEW.actor_type = 'system' THEN
    -- System actions don't need actor_id validation
    NULL;
  ELSE
    RAISE EXCEPTION 'Invalid actor_type. Must be one of: agent, customer, system';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for audit_logs
CREATE TRIGGER validate_audit_log_actor
  BEFORE INSERT OR UPDATE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION validate_audit_log_actor();

-- Add partial indexes to improve join performance
CREATE INDEX idx_audit_logs_agent_actor 
  ON audit_logs(actor_id) 
  WHERE actor_type = 'agent';

CREATE INDEX idx_audit_logs_customer_actor 
  ON audit_logs(actor_id) 
  WHERE actor_type = 'customer'; 