-- Drop search suggestions function and view
DROP FUNCTION IF EXISTS refresh_search_suggestions();
DROP MATERIALIZED VIEW IF EXISTS search_suggestions;

-- Drop failed searches table and indexes
DROP INDEX IF EXISTS failed_searches_created_at_idx;
DROP INDEX IF EXISTS failed_searches_user_id_idx;
DROP INDEX IF EXISTS failed_searches_query_idx;
DROP TABLE IF EXISTS failed_searches;

-- Drop search analytics table and indexes
DROP INDEX IF EXISTS search_analytics_created_at_idx;
DROP INDEX IF EXISTS search_analytics_user_id_idx;
DROP INDEX IF EXISTS search_analytics_query_idx;
DROP TABLE IF EXISTS search_analytics;

-- Drop article search vector trigger and function
DROP TRIGGER IF EXISTS articles_search_vector_update ON articles;
DROP FUNCTION IF EXISTS update_article_search_vector();

-- Drop article search index and vector
DROP INDEX IF EXISTS articles_search_idx;
ALTER TABLE articles DROP COLUMN IF EXISTS search_vector;

-- Drop search vector generation function
DROP FUNCTION IF EXISTS articles_search_vector(TEXT, TEXT, TEXT, TEXT[]); 