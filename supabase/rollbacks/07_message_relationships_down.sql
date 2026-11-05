-- Drop comments
COMMENT ON COLUMN messages.author_id IS NULL;

-- Drop trigger and function
DROP TRIGGER IF EXISTS validate_message_author_trigger ON messages;
DROP FUNCTION IF EXISTS validate_message_author();

-- Drop view
DROP VIEW IF EXISTS message_authors;

-- Drop indexes
DROP INDEX IF EXISTS idx_messages_author;
DROP INDEX IF EXISTS idx_messages_ticket_id;

-- Drop constraints
ALTER TABLE messages
DROP CONSTRAINT IF EXISTS messages_author_type_check; 