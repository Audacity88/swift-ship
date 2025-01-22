-- Add is_internal column to messages table
ALTER TABLE messages ADD COLUMN is_internal BOOLEAN NOT NULL DEFAULT FALSE;

-- Update RLS policies to ensure only agents can see internal notes
DROP POLICY IF EXISTS "Agents can read all messages" ON messages;
DROP POLICY IF EXISTS "Customers can read their own messages" ON messages;

CREATE POLICY "Agents can read all messages"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM agents WHERE agents.id = auth.uid()
  )
);

CREATE POLICY "Customers can read their non-internal messages"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = messages.ticket_id
    AND t.customer_id = auth.uid()
    AND NOT messages.is_internal
  )
); 