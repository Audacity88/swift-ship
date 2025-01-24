-- Fix the update_updated_at_column function to only update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a new function for tables that need updated_by tracking
CREATE OR REPLACE FUNCTION update_updated_at_and_by_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  -- Set updated_by from session variable if available
  NEW.updated_by = NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Update the tickets table to use the new trigger function
DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets;
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_and_by_column(); 