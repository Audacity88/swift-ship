-- Insert shipping category
INSERT INTO categories (name, slug, description)
VALUES (
  'Shipping',
  'shipping',
  'Information about shipping services, rates, packaging guidelines, and international shipping.'
);

-- Get the category ID and system user ID for reference
DO $$
DECLARE
  shipping_category_id UUID;
  system_user_id UUID;
BEGIN
  -- Get the shipping category ID
  SELECT id INTO shipping_category_id FROM categories WHERE slug = 'shipping';
  
  -- Create system user first in auth.users
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    role
  ) VALUES (
    gen_random_uuid(),
    'system@example.com',
    crypt('system123', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"System"}',
    NOW(),
    NOW(),
    'authenticated'
  )
  ON CONFLICT (email) DO UPDATE 
  SET updated_at = NOW()
  RETURNING id INTO system_user_id;

  -- Create system agent
  INSERT INTO agents (id, email, name, role)
  VALUES (
    system_user_id,
    'system@example.com',
    'System',
    'admin'
  )
  ON CONFLICT (id) DO UPDATE 
  SET email = EXCLUDED.email
  RETURNING id INTO system_user_id;

  -- Create shipping tags
  INSERT INTO tags (name, slug, color)
  VALUES 
    ('Rates', 'rates', '#FF6B6B'),
    ('Services', 'services', '#4ECDC4'),
    ('International', 'international', '#45B7D1'),
    ('Express', 'express', '#96CEB4'),
    ('Packaging', 'packaging', '#FFEEAD'),
    ('Safety', 'safety', '#D4A5A5'),
    ('Customs', 'customs', '#9B59B6'),
    ('Documentation', 'documentation', '#3498DB'),
    ('Tracking', 'tracking', '#2ECC71'),
    ('Claims', 'claims', '#E74C3C')
  ON CONFLICT (slug) DO UPDATE 
  SET name = EXCLUDED.name;

  -- Insert shipping rates article
  WITH article_insert AS (
    INSERT INTO articles (
      title,
      slug,
      excerpt,
      content,
      category_id,
      author_id,
      status,
      metadata
    )
    VALUES (
      'Complete Guide to Shipping Rates and Services',
      'shipping-rates-guide',
      'A comprehensive guide to our shipping services, from standard to express delivery options.',
      E'# Understanding Our Shipping Rates and Services\n\nOur shipping services are designed to meet various needs, from urgent deliveries to cost-effective solutions.\n\n## Standard Shipping\n- Delivery within 3-5 business days\n- Most cost-effective option\n- Available for packages up to 70 lbs\n- Free tracking included\n\n## Express Shipping\n- Next-day delivery for most locations\n- Available for urgent shipments\n- Premium insurance included\n- Real-time tracking updates\n\n## International Shipping\n- Delivery to over 200 countries\n- Customs documentation assistance\n- Multiple service levels available\n- Full tracking capability\n\n## Bulk Shipping\n- Special rates for high-volume shippers\n- Dedicated account manager\n- Customized pickup schedules\n- Volume discounts available\n\nContact our support team for specific rates and service availability in your area.',
      shipping_category_id,
      system_user_id,
      'published',
      jsonb_build_object(
        'views', 1250,
        'helpfulCount', 45,
        'notHelpfulCount', 5,
        'lastUpdated', NOW()
      )
    )
    RETURNING id
  )
  INSERT INTO article_tags (article_id, tag_id)
  SELECT 
    (SELECT id FROM article_insert),
    id
  FROM tags 
  WHERE slug IN ('rates', 'services', 'international', 'express');

  -- Insert packaging guidelines article
  WITH article_insert AS (
    INSERT INTO articles (
      title,
      slug,
      excerpt,
      content,
      category_id,
      author_id,
      status,
      metadata
    )
    VALUES (
      'Packaging Guidelines for Safe Shipping',
      'packaging-guidelines',
      'Learn how to properly package your items to ensure safe delivery.',
      E'# How to Package Your Items Safely\n\nProper packaging is crucial for ensuring your items arrive safely at their destination.\n\n## Essential Packaging Materials\n- Strong corrugated boxes\n- Bubble wrap or foam padding\n- Packing tape (2-inch width recommended)\n- Void fill material\n\n## Step-by-Step Packaging Guide\n1. Choose the right box size\n2. Wrap items individually\n3. Use adequate cushioning\n4. Seal all seams with tape\n5. Apply shipping labels clearly\n\n## Special Items Packaging\n- **Fragile Items**: Double-box with 3 inches of cushioning\n- **Electronics**: Use anti-static materials\n- **Liquids**: Use sealed containers and absorbent materials\n- **Artwork**: Use corner protectors and "Fragile" labels\n\n## Common Packaging Mistakes\n- Using old boxes\n- Insufficient cushioning\n- Poor tape application\n- Incorrect box size\n\nRemember: Good packaging prevents damage and saves money on claims.',
      shipping_category_id,
      system_user_id,
      'published',
      jsonb_build_object(
        'views', 890,
        'helpfulCount', 38,
        'notHelpfulCount', 2,
        'lastUpdated', NOW()
      )
    )
    RETURNING id
  )
  INSERT INTO article_tags (article_id, tag_id)
  SELECT 
    (SELECT id FROM article_insert),
    id
  FROM tags 
  WHERE slug IN ('packaging', 'safety');

  -- Continue with other articles...
END $$; 