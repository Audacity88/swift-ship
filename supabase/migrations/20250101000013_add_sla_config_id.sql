-- Create SLA configuration table
CREATE TABLE sla_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  first_response_time INTEGER NOT NULL, -- in minutes
  resolution_time INTEGER NOT NULL, -- in minutes
  business_hours JSONB NOT NULL DEFAULT '{
    "monday": {"start": "09:00", "end": "17:00"},
    "tuesday": {"start": "09:00", "end": "17:00"},
    "wednesday": {"start": "09:00", "end": "17:00"},
    "thursday": {"start": "09:00", "end": "17:00"},
    "friday": {"start": "09:00", "end": "17:00"}
  }',
  priority_multipliers JSONB NOT NULL DEFAULT '{
    "low": 1.0,
    "medium": 0.8,
    "high": 0.5,
    "urgent": 0.25
  }',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add SLA config reference to tickets table
ALTER TABLE tickets 
ADD COLUMN sla_config_id UUID REFERENCES sla_configs(id);

-- Create SLA status tracking table
CREATE TABLE sla_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id),
  first_response_deadline TIMESTAMPTZ,
  resolution_deadline TIMESTAMPTZ,
  first_response_met BOOLEAN,
  resolution_met BOOLEAN,
  paused_at TIMESTAMPTZ,
  pause_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_sla_status_ticket_id ON sla_status(ticket_id);
CREATE INDEX idx_tickets_sla_config_id ON tickets(sla_config_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_sla_configs_updated_at
  BEFORE UPDATE ON sla_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sla_status_updated_at
  BEFORE UPDATE ON sla_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default SLA configurations
INSERT INTO sla_configs (
  id,
  name,
  description,
  first_response_time,
  resolution_time
) VALUES 
(
  '00000000-0000-4000-a000-000000000001',
  'Urgent SLA',
  'Critical issues requiring immediate attention',
  30, -- 30 minutes first response
  240  -- 4 hours resolution
),
(
  '00000000-0000-4000-a000-000000000002',
  'High Priority SLA',
  'High priority issues requiring quick response',
  60, -- 1 hour first response
  480 -- 8 hours resolution
),
(
  '00000000-0000-4000-a000-000000000003',
  'Medium Priority SLA',
  'Standard priority issues',
  120, -- 2 hours first response
  1440 -- 24 hours resolution
),
(
  '00000000-0000-4000-a000-000000000004',
  'Low Priority SLA',
  'Non-critical issues',
  240, -- 4 hours first response
  2880 -- 48 hours resolution
);

-- Create function to calculate SLA deadlines
CREATE OR REPLACE FUNCTION calculate_sla_deadlines(
  p_created_at TIMESTAMPTZ,
  p_first_response_time INTEGER,
  p_resolution_time INTEGER,
  p_business_hours JSONB,
  p_priority TEXT
)
RETURNS TABLE (
  first_response_deadline TIMESTAMPTZ,
  resolution_deadline TIMESTAMPTZ
) AS $$
DECLARE
  v_first_response_mins INTEGER;
  v_resolution_mins INTEGER;
  v_priority_multiplier FLOAT;
BEGIN
  -- Get priority multiplier (default to 1.0 if not found)
  SELECT COALESCE(
    (p_business_hours->>'priority_multipliers')::jsonb->>p_priority,
    '1.0'
  )::FLOAT INTO v_priority_multiplier;

  -- Calculate adjusted times
  v_first_response_mins := (p_first_response_time * v_priority_multiplier)::INTEGER;
  v_resolution_mins := (p_resolution_time * v_priority_multiplier)::INTEGER;

  -- For now, simple calculation without business hours
  -- TODO: Implement business hours calculation
  RETURN QUERY
  SELECT
    p_created_at + (v_first_response_mins * interval '1 minute'),
    p_created_at + (v_resolution_mins * interval '1 minute');
END;
$$ LANGUAGE plpgsql;

-- Create function to initialize SLA tracking
CREATE OR REPLACE FUNCTION initialize_sla_tracking()
RETURNS TRIGGER AS $$
DECLARE
  v_sla_config sla_configs%ROWTYPE;
  v_deadlines RECORD;
BEGIN
  -- Get SLA configuration
  SELECT * INTO v_sla_config
  FROM sla_configs
  WHERE id = NEW.sla_config_id;

  IF v_sla_config.id IS NOT NULL THEN
    -- Calculate deadlines
    SELECT * INTO v_deadlines
    FROM calculate_sla_deadlines(
      NEW.created_at,
      v_sla_config.first_response_time,
      v_sla_config.resolution_time,
      v_sla_config.business_hours,
      NEW.priority::TEXT
    );

    -- Create SLA status record
    INSERT INTO sla_status (
      ticket_id,
      first_response_deadline,
      resolution_deadline,
      first_response_met,
      resolution_met
    ) VALUES (
      NEW.id,
      v_deadlines.first_response_deadline,
      v_deadlines.resolution_deadline,
      FALSE,
      FALSE
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for SLA initialization
CREATE TRIGGER initialize_ticket_sla
  AFTER INSERT ON tickets
  FOR EACH ROW
  WHEN (NEW.sla_config_id IS NOT NULL)
  EXECUTE FUNCTION initialize_sla_tracking();

-- Add RLS policies
ALTER TABLE sla_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_status ENABLE ROW LEVEL SECURITY;

-- Policies for sla_configs
CREATE POLICY "Allow read access to all authenticated users"
  ON sla_configs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all access to admins"
  ON sla_configs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = auth.uid()
      AND agents.role = 'admin'
    )
  );

-- Policies for sla_status
CREATE POLICY "Allow read access to ticket assignees and admins"
  ON sla_status FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      LEFT JOIN agents a ON a.id = t.assignee_id
      WHERE t.id = sla_status.ticket_id
      AND (
        t.assignee_id = auth.uid()
        OR a.role = 'admin'
      )
    )
  );

CREATE POLICY "Allow update access to ticket assignees and admins"
  ON sla_status FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      LEFT JOIN agents a ON a.id = t.assignee_id
      WHERE t.id = sla_status.ticket_id
      AND (
        t.assignee_id = auth.uid()
        OR a.role = 'admin'
      )
    )
  );

-- Create SLA pauses table
CREATE TABLE sla_pauses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id),
  reason TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES agents(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resumed_at TIMESTAMPTZ,
  resumed_by UUID REFERENCES agents(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_sla_pauses_ticket_id ON sla_pauses(ticket_id);

-- Create trigger for updated_at
CREATE TRIGGER update_sla_pauses_updated_at
  BEFORE UPDATE ON sla_pauses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for sla_pauses
ALTER TABLE sla_pauses ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for sla_pauses
CREATE POLICY "Allow read access to ticket assignees and admins"
  ON sla_pauses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      LEFT JOIN agents a ON a.id = t.assignee_id
      WHERE t.id = sla_pauses.ticket_id
      AND (
        t.assignee_id = auth.uid()
        OR a.role = 'admin'
      )
    )
  );

CREATE POLICY "Allow insert access to ticket assignees and admins"
  ON sla_pauses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets t
      LEFT JOIN agents a ON a.id = t.assignee_id
      WHERE t.id = ticket_id
      AND (
        t.assignee_id = auth.uid()
        OR a.role = 'admin'
      )
    )
  );

CREATE POLICY "Allow update access to ticket assignees and admins"
  ON sla_pauses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      LEFT JOIN agents a ON a.id = t.assignee_id
      WHERE t.id = sla_pauses.ticket_id
      AND (
        t.assignee_id = auth.uid()
        OR a.role = 'admin'
      )
    )
  );
