-- Create a function to generate the search vector for articles
CREATE OR REPLACE FUNCTION articles_search_vector(
  title TEXT,
  content TEXT,
  excerpt TEXT,
  tags TEXT[]
) RETURNS tsvector AS $$
BEGIN
  RETURN (
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(excerpt, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(content, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(tags, ' '), '')), 'B')
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add search vector column to articles table
ALTER TABLE articles
ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
  articles_search_vector(title, content, excerpt, tags)
) STORED;

-- Create GIN index for fast full-text search
CREATE INDEX articles_search_idx ON articles USING GIN (search_vector);

-- Create function to update search_vector on article update
CREATE OR REPLACE FUNCTION update_article_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := articles_search_vector(
    NEW.title,
    NEW.content,
    NEW.excerpt,
    NEW.tags
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update search_vector
CREATE TRIGGER articles_search_vector_update
  BEFORE INSERT OR UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_article_search_vector();

-- Create function to validate searcher references
CREATE OR REPLACE FUNCTION validate_searcher()
RETURNS trigger AS $$
BEGIN
  IF NEW.searcher_type = 'customer' THEN
    IF NOT EXISTS (SELECT 1 FROM customers WHERE id = NEW.searcher_id) THEN
      RAISE EXCEPTION 'Invalid customer ID: %', NEW.searcher_id;
    END IF;
  ELSIF NEW.searcher_type = 'agent' THEN
    IF NOT EXISTS (SELECT 1 FROM agents WHERE id = NEW.searcher_id) THEN
      RAISE EXCEPTION 'Invalid agent ID: %', NEW.searcher_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create table for search analytics
CREATE TABLE search_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query TEXT NOT NULL,
  searcher_type TEXT NOT NULL CHECK (searcher_type IN ('customer', 'agent')),
  searcher_id UUID NOT NULL,
  filters JSONB,
  result_count INTEGER NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for search analytics searcher validation
CREATE TRIGGER validate_search_analytics_searcher
  BEFORE INSERT OR UPDATE ON search_analytics
  FOR EACH ROW
  EXECUTE FUNCTION validate_searcher();

-- Create index for search analytics queries
CREATE INDEX search_analytics_query_idx ON search_analytics USING GIN (to_tsvector('english', query));
CREATE INDEX search_analytics_searcher_idx ON search_analytics(searcher_type, searcher_id);
CREATE INDEX search_analytics_created_at_idx ON search_analytics(created_at);

-- Create table for failed searches
CREATE TABLE failed_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query TEXT NOT NULL,
  searcher_type TEXT NOT NULL CHECK (searcher_type IN ('customer', 'agent')),
  searcher_id UUID NOT NULL,
  filters JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for failed searches searcher validation
CREATE TRIGGER validate_failed_searches_searcher
  BEFORE INSERT OR UPDATE ON failed_searches
  FOR EACH ROW
  EXECUTE FUNCTION validate_searcher();

-- Create index for failed searches
CREATE INDEX failed_searches_query_idx ON failed_searches USING GIN (to_tsvector('english', query));
CREATE INDEX failed_searches_searcher_idx ON failed_searches(searcher_type, searcher_id);
CREATE INDEX failed_searches_created_at_idx ON failed_searches(created_at);

-- Create materialized view for search suggestions
CREATE MATERIALIZED VIEW search_suggestions AS
SELECT
  word,
  COUNT(*) as frequency,
  MAX(created_at) as last_searched_at
FROM (
  SELECT
    regexp_split_to_table(lower(query), '\s+') as word,
    created_at
  FROM search_analytics
  WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
) words
WHERE length(word) > 2
GROUP BY word
ORDER BY frequency DESC, last_searched_at DESC;

-- Create index for search suggestions
CREATE UNIQUE INDEX search_suggestions_word_idx ON search_suggestions(word);
CREATE INDEX search_suggestions_frequency_idx ON search_suggestions(frequency DESC, last_searched_at DESC);

-- Create function to refresh search suggestions
CREATE OR REPLACE FUNCTION refresh_search_suggestions()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY search_suggestions;
END;
$$ LANGUAGE plpgsql; 