-- Drop audit triggers
DROP TRIGGER IF EXISTS audit_article_ratings ON article_ratings;
DROP TRIGGER IF EXISTS audit_article_versions ON article_versions;
DROP TRIGGER IF EXISTS audit_categories ON categories;
DROP TRIGGER IF EXISTS audit_articles ON articles;

-- Drop update triggers
DROP TRIGGER IF EXISTS update_articles_updated_at ON articles;
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;

-- Drop indexes
DROP INDEX IF EXISTS idx_article_ratings_user;
DROP INDEX IF EXISTS idx_article_ratings_article;
DROP INDEX IF EXISTS idx_article_versions_article;
DROP INDEX IF EXISTS idx_articles_updated;
DROP INDEX IF EXISTS idx_articles_created;
DROP INDEX IF EXISTS idx_articles_status;
DROP INDEX IF EXISTS idx_articles_author;
DROP INDEX IF EXISTS idx_articles_category;
DROP INDEX IF EXISTS idx_categories_order;
DROP INDEX IF EXISTS idx_categories_parent;

-- Drop tables in correct order
DROP TABLE IF EXISTS article_ratings;
DROP TABLE IF EXISTS article_versions;
DROP TABLE IF EXISTS articles;
DROP TABLE IF EXISTS categories; 