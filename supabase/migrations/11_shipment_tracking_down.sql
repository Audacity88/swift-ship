

-- Down Migration
-- To be run when rolling back this migration
DROP TRIGGER IF EXISTS create_status_event ON shipments;
DROP FUNCTION IF EXISTS create_shipment_status_event();

DROP TRIGGER IF EXISTS create_shipment_event ON shipments;
DROP FUNCTION IF EXISTS create_initial_shipment_event();

DROP TRIGGER IF EXISTS update_shipment_timestamp ON shipments;
DROP FUNCTION IF EXISTS update_shipment_updated_at();

DROP INDEX IF EXISTS idx_shipment_events_shipment;
DROP INDEX IF EXISTS idx_shipments_status;
DROP INDEX IF EXISTS idx_shipments_customer;

DROP TABLE IF EXISTS shipment_events;
DROP TABLE IF EXISTS shipments; 