-- Revert RLS policies
DROP POLICY IF EXISTS "Agents can read all messages" ON messages;
DROP POLICY IF EXISTS "Customers can read their non-internal messages" ON messages;

CREATE POLICY "Agents can read all messages"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM agents WHERE agents.id = auth.uid()
  )
);

CREATE POLICY "Customers can read their own messages"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = messages.ticket_id
    AND t.customer_id = auth.uid()
  )
);

-- Remove is_internal column
ALTER TABLE messages DROP COLUMN is_internal; 