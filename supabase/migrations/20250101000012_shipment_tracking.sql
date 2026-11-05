-- Create shipments table
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID REFERENCES tickets(id),
  customer_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('full_truckload', 'less_than_truckload', 'sea_container', 'bulk_freight')),
  status TEXT NOT NULL CHECK (status IN (
    'quote_requested', 'quote_provided', 'quote_accepted',
    'pickup_scheduled', 'pickup_completed', 'in_transit',
    'out_for_delivery', 'delivered', 'cancelled'
  )),
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  scheduled_pickup TIMESTAMP WITH TIME ZONE,
  estimated_delivery TIMESTAMP WITH TIME ZONE,
  actual_delivery TIMESTAMP WITH TIME ZONE,
  tracking_number TEXT UNIQUE NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shipment events table for tracking status changes
CREATE TABLE shipment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'quote_requested', 'quote_provided', 'quote_accepted',
    'pickup_scheduled', 'pickup_completed', 'in_transit',
    'out_for_delivery', 'delivered', 'cancelled'
  )),
  location TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) NOT NULL
);

-- Add indexes for common queries
CREATE INDEX idx_shipments_customer ON shipments(customer_id);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipment_events_shipment ON shipment_events(shipment_id);

-- Function to update shipment updated_at timestamp
CREATE OR REPLACE FUNCTION update_shipment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_shipment_timestamp
  BEFORE UPDATE ON shipments
  FOR EACH ROW
  EXECUTE FUNCTION update_shipment_updated_at();

-- Function to create initial shipment event
CREATE OR REPLACE FUNCTION create_initial_shipment_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO shipment_events (
    shipment_id,
    status,
    created_by
  ) VALUES (
    NEW.id,
    NEW.status,
    NEW.customer_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create initial event
CREATE TRIGGER create_shipment_event
  AFTER INSERT ON shipments
  FOR EACH ROW
  EXECUTE FUNCTION create_initial_shipment_event();

-- Function to create event on status change
CREATE OR REPLACE FUNCTION create_shipment_status_event()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO shipment_events (
      shipment_id,
      status,
      created_by
    ) VALUES (
      NEW.id,
      NEW.status,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create event on status change
CREATE TRIGGER create_status_event
  AFTER UPDATE OF status ON shipments
  FOR EACH ROW
  EXECUTE FUNCTION create_shipment_status_event();