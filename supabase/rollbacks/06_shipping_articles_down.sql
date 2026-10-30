-- Delete all shipping articles
DELETE FROM articles WHERE category_id = (
  SELECT id FROM categories WHERE slug = 'shipping'
);

-- Delete the shipping category
DELETE FROM categories WHERE slug = 'shipping';

-- Note: We don't delete the system user as it might be used by other parts of the system 