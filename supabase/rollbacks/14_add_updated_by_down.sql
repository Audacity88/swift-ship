
-- Down Migration
-- Restore original trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column_down()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop columns
ALTER TABLE tickets
DROP COLUMN IF EXISTS updated_by,
DROP COLUMN IF EXISTS created_by; 