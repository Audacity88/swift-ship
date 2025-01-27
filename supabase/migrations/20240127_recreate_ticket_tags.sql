-- Drop existing ticket_tags table
DROP TABLE IF EXISTS ticket_tags;

-- Recreate ticket_tags table
CREATE TABLE ticket_tags (
  ticket_id UUID NOT NULL REFERENCES tickets(id),
  tag_id UUID NOT NULL REFERENCES tags(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (ticket_id, tag_id)
); 