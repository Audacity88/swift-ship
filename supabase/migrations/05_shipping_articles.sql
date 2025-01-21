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
  system_user_id UUID := 'e41ce3d6-0e65-4a83-87d4-7c83a9820c8e';
BEGIN
  -- Get the shipping category ID
  SELECT id INTO shipping_category_id FROM categories WHERE slug = 'shipping';

  -- Insert shipping rates article
  INSERT INTO articles (
    title,
    slug,
    excerpt,
    content,
    category_id,
    author_id,
    status,
    tags,
    metadata
  )
  VALUES (
    'Complete Guide to Shipping Rates and Services',
    'shipping-rates-guide',
    'A comprehensive guide to our shipping services, rates, and delivery options.',
    E'# Understanding Our Shipping Rates and Services\n\nOur shipping services are designed to meet various needs, from urgent deliveries to cost-effective solutions.\n\n## Standard Shipping\n- Delivery within 3-5 business days\n- Most cost-effective option\n- Available for packages up to 70 lbs\n- Free tracking included\n\n## Express Shipping\n- Next-day delivery for most locations\n- Available for urgent shipments\n- Premium insurance included\n- Real-time tracking updates\n\n## International Shipping\n- Delivery to over 200 countries\n- Customs documentation assistance\n- Multiple service levels available\n- Full tracking capability\n\n## Bulk Shipping\n- Special rates for high-volume shippers\n- Dedicated account manager\n- Customized pickup schedules\n- Volume discounts available\n\nContact our support team for specific rates and service availability in your area.',
    shipping_category_id,
    system_user_id,
    'published',
    ARRAY['rates', 'services', 'international', 'express'],
    jsonb_build_object(
      'views', 1250,
      'helpfulCount', 45,
      'notHelpfulCount', 5,
      'lastUpdated', NOW()
    )
  );

  -- Insert packaging guidelines article
  INSERT INTO articles (
    title,
    slug,
    excerpt,
    content,
    category_id,
    author_id,
    status,
    tags,
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
    ARRAY['packaging', 'guidelines', 'safety', 'fragile'],
    jsonb_build_object(
      'views', 890,
      'helpfulCount', 38,
      'notHelpfulCount', 2,
      'lastUpdated', NOW()
    )
  );

  -- Insert international customs article
  INSERT INTO articles (
    title,
    slug,
    excerpt,
    content,
    category_id,
    author_id,
    status,
    tags,
    metadata
  )
  VALUES (
    'International Shipping: Customs Guide',
    'international-customs',
    'Essential information about customs requirements and international shipping procedures.',
    E'# International Shipping and Customs Guide\n\nUnderstanding customs requirements is essential for successful international shipping.\n\n## Required Documentation\n- Commercial Invoice\n- Packing List\n- Certificate of Origin (when required)\n- Export Declaration\n- Import License (if applicable)\n\n## Prohibited Items\n- Dangerous goods\n- Perishable items\n- Currency\n- Precious metals\n- Restricted medications\n\n## Customs Clearance Process\n1. Documentation review\n2. Duty and tax assessment\n3. Physical inspection (if required)\n4. Release approval\n\n## Tips for Smooth Customs Clearance\n- Declare items accurately\n- Include detailed descriptions\n- Provide accurate values\n- Follow country-specific regulations\n- Keep copies of all documents\n\n## Common Customs Delays\n- Incomplete documentation\n- Incorrect value declaration\n- Missing licenses\n- Prohibited items\n\nContact our international shipping specialists for assistance with specific countries.',
    shipping_category_id,
    system_user_id,
    'published',
    ARRAY['international', 'customs', 'documentation', 'regulations'],
    jsonb_build_object(
      'views', 750,
      'helpfulCount', 32,
      'notHelpfulCount', 4,
      'lastUpdated', NOW()
    )
  );

  -- Insert tracking guide article
  INSERT INTO articles (
    title,
    slug,
    excerpt,
    content,
    category_id,
    author_id,
    status,
    tags,
    metadata
  )
  VALUES (
    'How to Track Your Shipment',
    'tracking-guide',
    'A complete guide to tracking your shipments and understanding tracking statuses.',
    E'# Complete Shipment Tracking Guide\n\nLearn how to track your shipments and understand tracking statuses.\n\n## Tracking Methods\n- Online tracking portal\n- Mobile app tracking\n- Email notifications\n- SMS updates\n\n## Understanding Tracking Statuses\n- **Label Created**: Shipment registered\n- **Picked Up**: In our possession\n- **In Transit**: Moving through network\n- **Out for Delivery**: Final delivery attempt\n- **Delivered**: Successfully delivered\n- **Exception**: Delivery issue occurred\n\n## Setting Up Notifications\n1. Create an account\n2. Add tracking numbers\n3. Choose notification preferences\n4. Select update frequency\n\n## Advanced Tracking Features\n- Signature verification\n- Proof of delivery\n- Delivery instructions\n- Location mapping\n\n## Troubleshooting\n- No tracking updates\n- Incorrect status\n- Missing delivery\n- Technical issues\n\nContact support if you need help understanding your tracking information.',
    shipping_category_id,
    system_user_id,
    'published',
    ARRAY['tracking', 'delivery', 'notifications', 'status'],
    jsonb_build_object(
      'views', 1500,
      'helpfulCount', 52,
      'notHelpfulCount', 3,
      'lastUpdated', NOW()
    )
  );

  -- Insert claims process article
  INSERT INTO articles (
    title,
    slug,
    excerpt,
    content,
    category_id,
    author_id,
    status,
    tags,
    metadata
  )
  VALUES (
    'Filing a Claim for Lost or Damaged Shipments',
    'claims-process',
    'Step-by-step guide for filing and processing claims for lost or damaged shipments.',
    E'# Shipping Claims Process Guide\n\nLearn how to file and process claims for lost or damaged shipments.\n\n## When to File a Claim\n- Missing packages\n- Damaged contents\n- Delayed delivery\n- Wrong delivery location\n\n## Required Documentation\n- Tracking number\n- Photos of damage\n- Original invoice\n- Packaging materials\n- Inspection report (if applicable)\n\n## Claims Process Steps\n1. Report the issue immediately\n2. Document the damage\n3. Submit claim form\n4. Provide supporting documents\n5. Wait for claim review\n6. Receive decision\n\n## Claim Filing Tips\n- File within 15 days\n- Keep all original packaging\n- Take detailed photos\n- Save all receipts\n- Document communication\n\n## Common Claim Issues\n- Late filing\n- Insufficient documentation\n- Improper packaging\n- Missing information\n\nContact our claims department for assistance with your specific case.',
    shipping_category_id,
    system_user_id,
    'published',
    ARRAY['claims', 'damage', 'lost packages', 'insurance'],
    jsonb_build_object(
      'views', 680,
      'helpfulCount', 29,
      'notHelpfulCount', 3,
      'lastUpdated', NOW()
    )
  );
END $$; 