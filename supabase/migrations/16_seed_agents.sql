-- Seed data for agents table
INSERT INTO agents (name, email, avatar, role) VALUES
  -- Admin agents
  ('Sarah Chen', 'sarah.chen@example.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah', 'admin'),
  ('Michael Rodriguez', 'michael.rodriguez@example.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=michael', 'admin'),
  
  -- Regular agents with different specialties
  ('Emma Wilson', 'emma.wilson@example.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=emma', 'agent'),
  ('David Kim', 'david.kim@example.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=david', 'agent'),
  ('Priya Patel', 'priya.patel@example.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=priya', 'agent'),
  ('James Thompson', 'james.thompson@example.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=james', 'agent'),
  ('Sofia Garcia', 'sofia.garcia@example.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=sofia', 'agent'),
  ('Lucas Brown', 'lucas.brown@example.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=lucas', 'agent'),
  ('Aisha Ahmed', 'aisha.ahmed@example.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=aisha', 'agent'),
  ('Thomas Lee', 'thomas.lee@example.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=thomas', 'agent');

