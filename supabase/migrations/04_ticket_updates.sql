-- Add resolved_at fields to tickets table
ALTER TABLE tickets
ADD COLUMN resolved_at TIMESTAMPTZ,
ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for resolved_at for performance
CREATE INDEX idx_tickets_resolved_at ON tickets(resolved_at);

-- Add index for metadata JSONB fields we'll frequently query
CREATE INDEX idx_tickets_metadata_gin ON tickets USING gin (metadata);

-- Add trigger to ensure metadata is always an object
CREATE OR REPLACE FUNCTION ensure_ticket_metadata_object()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.metadata IS NULL THEN
    NEW.metadata := '{}'::jsonb;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_ticket_metadata_object
  BEFORE INSERT OR UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION ensure_ticket_metadata_object(); 