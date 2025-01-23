-- Up Migration
-- Add updated_by column to tickets table
ALTER TABLE tickets
ADD COLUMN updated_by UUID REFERENCES agents(id);

-- Add created_by column to tickets table for consistency
ALTER TABLE tickets
ADD COLUMN created_by UUID REFERENCES agents(id);

-- Update the audit trigger to handle these new columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  -- Set updated_by from session variable if available
  NEW.updated_by = NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID;
  RETURN NEW;
END;
$$ language 'plpgsql';
