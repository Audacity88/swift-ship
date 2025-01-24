-- Remove seeded agents
DELETE FROM agents 
WHERE email IN (
  'sarah.chen@example.com',
  'michael.rodriguez@example.com',
  'emma.wilson@example.com',
  'david.kim@example.com',
  'priya.patel@example.com',
  'james.thompson@example.com',
  'sofia.garcia@example.com',
  'lucas.brown@example.com',
  'aisha.ahmed@example.com',
  'thomas.lee@example.com'
);

-- Remove the table comment
COMMENT ON TABLE agents IS NULL;
