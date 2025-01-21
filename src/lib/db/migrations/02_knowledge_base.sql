-- Create categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_id UUID REFERENCES categories(id),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create articles table
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id),
  author_id UUID NOT NULL REFERENCES agents(id),
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata JSONB NOT NULL DEFAULT '{
    "views": 0,
    "helpfulCount": 0,
    "notHelpfulCount": 0,
    "lastUpdated": null
  }'::JSONB,
  current_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create article_versions table to track history
CREATE TABLE article_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES articles(id),
  version INTEGER NOT NULL,
  changes JSONB NOT NULL,
  author_id UUID NOT NULL REFERENCES agents(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(article_id, version)
);

-- Create article_ratings table
CREATE TABLE article_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES articles(id),
  user_id UUID NOT NULL REFERENCES customers(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_order ON categories(order_index);
CREATE INDEX idx_articles_category ON articles(category_id);
CREATE INDEX idx_articles_author ON articles(author_id);
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_created ON articles(created_at);
CREATE INDEX idx_articles_updated ON articles(updated_at);
CREATE INDEX idx_article_versions_article ON article_versions(article_id);
CREATE INDEX idx_article_ratings_article ON article_ratings(article_id);
CREATE INDEX idx_article_ratings_user ON article_ratings(user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add audit triggers
CREATE TRIGGER audit_articles
  AFTER INSERT OR UPDATE OR DELETE ON articles
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_categories
  AFTER INSERT OR UPDATE OR DELETE ON categories
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_article_versions
  AFTER INSERT OR UPDATE OR DELETE ON article_versions
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_article_ratings
  AFTER INSERT OR UPDATE OR DELETE ON article_ratings
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes(); 