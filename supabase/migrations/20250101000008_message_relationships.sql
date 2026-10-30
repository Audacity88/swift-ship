-- Drop existing constraints if they exist
ALTER TABLE messages
DROP CONSTRAINT IF EXISTS messages_author_customer_fkey,
DROP CONSTRAINT IF EXISTS messages_author_agent_fkey,
DROP CONSTRAINT IF EXISTS messages_author_type_check;

-- Add check constraints for author types
ALTER TABLE messages
ADD CONSTRAINT messages_author_type_check
CHECK (author_type IN ('customer', 'agent'));

-- Create views for PostgREST to handle polymorphic relationships
DROP VIEW IF EXISTS message_authors;
CREATE VIEW message_authors AS
  SELECT id as author_id, 'customer' as author_type, email, name
  FROM customers
  UNION ALL
  SELECT id as author_id, 'agent' as author_type, email, name
  FROM agents;

-- Add indexes for better performance
DROP INDEX IF EXISTS idx_messages_author;
DROP INDEX IF EXISTS idx_messages_ticket_id;
CREATE INDEX idx_messages_author ON messages(author_id, author_type);
CREATE INDEX idx_messages_ticket_id ON messages(ticket_id);

-- Create function to validate message author
CREATE OR REPLACE FUNCTION validate_message_author()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.author_type = 'customer' THEN
    IF NOT EXISTS (SELECT 1 FROM customers WHERE id = NEW.author_id) THEN
      RAISE EXCEPTION 'Invalid customer ID for message author: %', NEW.author_id;
    END IF;
  ELSIF NEW.author_type = 'agent' THEN
    IF NOT EXISTS (SELECT 1 FROM agents WHERE id = NEW.author_id) THEN
      RAISE EXCEPTION 'Invalid agent ID for message author: %', NEW.author_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid author_type: %', NEW.author_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation
DROP TRIGGER IF EXISTS validate_message_author_trigger ON messages;
CREATE TRIGGER validate_message_author_trigger
  BEFORE INSERT OR UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION validate_message_author(); 