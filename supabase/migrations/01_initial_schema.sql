-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar TEXT,
  company TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create agents table
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar TEXT,
  role TEXT NOT NULL CHECK (role IN ('agent', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create tags table
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  parent_id UUID REFERENCES tags(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name)
);

-- Create custom_field_definitions table
CREATE TABLE custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('text', 'number', 'date', 'dropdown', 'multiselect', 'checkbox', 'url', 'email')),
  validation JSONB,
  default_value JSONB,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name)
);

-- Create tickets table
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  type TEXT NOT NULL CHECK (type IN ('question', 'problem', 'incident', 'task')),
  customer_id UUID NOT NULL REFERENCES customers(id),
  assignee_id UUID REFERENCES agents(id),
  source TEXT NOT NULL CHECK (source IN ('email', 'web', 'phone', 'chat')),
  due_date TIMESTAMPTZ,
  category TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create ticket_custom_fields table
CREATE TABLE ticket_custom_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id),
  field_id UUID NOT NULL REFERENCES custom_field_definitions(id),
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ticket_id, field_id)
);

-- Create ticket_tags table
CREATE TABLE ticket_tags (
  ticket_id UUID NOT NULL REFERENCES tickets(id),
  tag_id UUID NOT NULL REFERENCES tags(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (ticket_id, tag_id)
);

-- Create ticket_followers table
CREATE TABLE ticket_followers (
  ticket_id UUID NOT NULL REFERENCES tickets(id),
  agent_id UUID NOT NULL REFERENCES agents(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (ticket_id, agent_id)
);

-- Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id),
  content TEXT NOT NULL,
  author_type TEXT NOT NULL CHECK (author_type IN ('customer', 'agent')),
  author_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create function to validate message author
CREATE OR REPLACE FUNCTION validate_message_author()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.author_type = 'customer' THEN
    IF NOT EXISTS (SELECT 1 FROM customers WHERE id = NEW.author_id) THEN
      RAISE EXCEPTION 'Invalid customer ID for message author';
    END IF;
  ELSIF NEW.author_type = 'agent' THEN
    IF NOT EXISTS (SELECT 1 FROM agents WHERE id = NEW.author_id) THEN
      RAISE EXCEPTION 'Invalid agent ID for message author';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for message author validation
CREATE TRIGGER validate_message_author
  BEFORE INSERT OR UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION validate_message_author();

-- Create message_attachments table
CREATE TABLE message_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create ticket_snapshots table
CREATE TABLE ticket_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id),
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL,
  reason TEXT,
  triggered_by UUID NOT NULL REFERENCES agents(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create status_history table
CREATE TABLE status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id),
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES agents(id),
  reason TEXT,
  automation_triggered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create sla_states table
CREATE TABLE sla_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) UNIQUE,
  config_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  paused_at TIMESTAMPTZ,
  breached_at TIMESTAMPTZ,
  response_breached BOOLEAN NOT NULL DEFAULT false,
  resolution_breached BOOLEAN NOT NULL DEFAULT false,
  total_paused_time INTEGER NOT NULL DEFAULT 0,
  last_escalation_at TIMESTAMPTZ,
  last_escalation_threshold INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create audit_logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('customer', 'agent', 'system')),
  changes JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_tickets_customer ON tickets(customer_id);
CREATE INDEX idx_tickets_assignee ON tickets(assignee_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);
CREATE INDEX idx_tickets_updated_at ON tickets(updated_at);
CREATE INDEX idx_messages_ticket ON messages(ticket_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_status_history_ticket ON status_history(ticket_id);
CREATE INDEX idx_ticket_snapshots_ticket ON ticket_snapshots(ticket_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tags_updated_at
  BEFORE UPDATE ON tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_field_definitions_updated_at
  BEFORE UPDATE ON custom_field_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ticket_custom_fields_updated_at
  BEFORE UPDATE ON ticket_custom_fields
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sla_states_updated_at
  BEFORE UPDATE ON sla_states
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to record audit logs
CREATE OR REPLACE FUNCTION audit_log_changes()
RETURNS TRIGGER AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  changes JSONB;
  actor_id UUID;
  actor_type TEXT;
BEGIN
  -- Get actor info from session variables (to be set by application)
  actor_id := NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID;
  actor_type := NULLIF(current_setting('app.current_user_type', TRUE), '');
  
  -- Default to system if no actor is set
  IF actor_id IS NULL THEN
    actor_id := '00000000-0000-0000-0000-000000000000'::UUID;
    actor_type := 'system';
  END IF;

  -- Handle different operations
  CASE TG_OP
    WHEN 'INSERT' THEN
      old_data := NULL;
      new_data := to_jsonb(NEW);
      changes := jsonb_build_object('new', new_data);
    WHEN 'UPDATE' THEN
      old_data := to_jsonb(OLD);
      new_data := to_jsonb(NEW);
      changes := jsonb_build_object(
        'old', old_data,
        'new', new_data,
        'changed_fields', (
          SELECT jsonb_object_agg(key, value)
          FROM jsonb_each(new_data)
          WHERE new_data->key IS DISTINCT FROM old_data->key
        )
      );
    WHEN 'DELETE' THEN
      old_data := to_jsonb(OLD);
      new_data := NULL;
      changes := jsonb_build_object('old', old_data);
  END CASE;

  -- Record the audit log
  INSERT INTO audit_logs (
    entity_type,
    entity_id,
    action,
    actor_id,
    actor_type,
    changes,
    metadata
  ) VALUES (
    TG_TABLE_NAME,
    CASE TG_OP
      WHEN 'DELETE' THEN (OLD).id
      ELSE (NEW).id
    END,
    TG_OP,
    actor_id,
    actor_type,
    changes,
    jsonb_build_object(
      'timestamp', CURRENT_TIMESTAMP,
      'client_info', current_setting('app.client_info', TRUE)
    )
  );

  -- Return appropriate record based on operation
  CASE TG_OP
    WHEN 'DELETE' THEN RETURN OLD;
    ELSE RETURN NEW;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle audit log retention
CREATE OR REPLACE FUNCTION cleanup_audit_logs()
RETURNS void AS $$
DECLARE
  retention_days INTEGER := 90; -- Default to 90 days
BEGIN
  -- Get retention period from config if set
  retention_days := COALESCE(NULLIF(current_setting('app.audit_retention_days', TRUE), '')::INTEGER, retention_days);
  
  -- Delete old audit logs
  DELETE FROM audit_logs
  WHERE created_at < (CURRENT_TIMESTAMP - (retention_days || ' days')::INTERVAL);
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers for key tables
CREATE TRIGGER audit_tickets
  AFTER INSERT OR UPDATE OR DELETE ON tickets
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_messages
  AFTER INSERT OR UPDATE OR DELETE ON messages
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_ticket_custom_fields
  AFTER INSERT OR UPDATE OR DELETE ON ticket_custom_fields
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_ticket_tags
  AFTER INSERT OR UPDATE OR DELETE ON ticket_tags
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_status_history
  AFTER INSERT OR UPDATE OR DELETE ON status_history
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_sla_states
  AFTER INSERT OR UPDATE OR DELETE ON sla_states
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

-- Create index for audit log querying
CREATE INDEX idx_audit_logs_entity_timestamp ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_type, actor_id); 