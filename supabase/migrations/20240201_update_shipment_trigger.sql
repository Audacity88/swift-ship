-- Update the function to handle both authenticated and service role contexts
CREATE OR REPLACE FUNCTION create_shipment_status_event()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Try to get the current user id, defaulting to customer_id if not available
  IF current_setting('request.jwt.claims', true)::json->>'role' = 'service_role' THEN
    current_user_id := NEW.customer_id;
  ELSE
    current_user_id := COALESCE(auth.uid(), NEW.customer_id);
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO shipment_events (
      shipment_id,
      status,
      notes,
      created_by
    ) VALUES (
      NEW.id,
      NEW.status,
      CASE 
        WHEN NEW.status = 'cancelled' THEN 'Cancelled via AI assistant'
        ELSE 'Status updated to ' || NEW.status
      END,
      current_user_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Down migration
-- CREATE OR REPLACE FUNCTION create_shipment_status_event()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   IF OLD.status IS DISTINCT FROM NEW.status THEN
--     INSERT INTO shipment_events (
--       shipment_id,
--       status,
--       created_by
--     ) VALUES (
--       NEW.id,
--       NEW.status,
--       auth.uid()
--     );
--   END IF;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql; 