-- Complete the schema used by the application. Profiles represent real auth identities.
ALTER TABLE customers ADD CONSTRAINT customers_auth_user_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE agents ADD CONSTRAINT agents_auth_user_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE customers ADD COLUMN phone text, ADD COLUMN job_title text,
  ADD COLUMN preferences jsonb NOT NULL DEFAULT '{}', ADD COLUMN created_by uuid REFERENCES auth.users(id),
  ADD COLUMN updated_by uuid REFERENCES auth.users(id), ADD COLUMN is_active boolean NOT NULL DEFAULT true;
ALTER TABLE agents ADD COLUMN avatar_url text, ADD COLUMN is_active boolean NOT NULL DEFAULT true;
ALTER TABLE agents DROP CONSTRAINT agents_role_check;
ALTER TABLE agents ADD CONSTRAINT agents_role_check CHECK (role IN ('agent','admin','supervisor'));
ALTER TABLE tickets DROP CONSTRAINT tickets_updated_by_fkey;
ALTER TABLE tickets ADD CONSTRAINT tickets_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE tickets ALTER COLUMN status SET DEFAULT 'open', ALTER COLUMN priority SET DEFAULT 'medium',
  ALTER COLUMN type SET DEFAULT 'question', ALTER COLUMN source SET DEFAULT 'web';
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE shipments ADD COLUMN updated_by uuid REFERENCES auth.users(id);
ALTER TABLE custom_field_definitions ADD COLUMN created_by uuid REFERENCES auth.users(id),
  ADD COLUMN updated_by uuid REFERENCES auth.users(id), ADD COLUMN required boolean NOT NULL DEFAULT false,
  ADD COLUMN options jsonb, ADD COLUMN is_archived boolean NOT NULL DEFAULT false;
ALTER TABLE custom_field_definitions ALTER COLUMN display_order SET DEFAULT 0;
ALTER TABLE articles ADD COLUMN author jsonb, ADD COLUMN created_by uuid REFERENCES auth.users(id),
  ADD COLUMN updated_by uuid REFERENCES auth.users(id);
ALTER TABLE categories ADD COLUMN created_by uuid REFERENCES auth.users(id), ADD COLUMN updated_by uuid REFERENCES auth.users(id);
ALTER TABLE article_versions ADD COLUMN title text, ADD COLUMN content text;
ALTER TABLE article_ratings ADD COLUMN is_helpful boolean, ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE article_ratings ALTER COLUMN rating SET DEFAULT 5;
ALTER TABLE article_ratings ADD CONSTRAINT article_ratings_user_article_key UNIQUE(user_id, article_id);
-- Sample article popularity numbers must not masquerade as usage from this installation.
UPDATE articles SET metadata = '{"views":0,"helpfulCount":0,"notHelpfulCount":0,"lastUpdated":null}'::jsonb;

CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, description text,
  schedule jsonb NOT NULL DEFAULT '{}', skills jsonb NOT NULL DEFAULT '[]', metrics jsonb NOT NULL DEFAULT '{}',
  timezone text NOT NULL DEFAULT 'UTC', is_active boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_by uuid REFERENCES auth.users(id), updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE agents ADD COLUMN team_id uuid REFERENCES teams(id);
ALTER TABLE tickets ADD COLUMN team_id uuid REFERENCES teams(id);
CREATE TABLE team_members (
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'agent' CHECK(role IN ('agent','admin','supervisor')),
  schedule jsonb NOT NULL DEFAULT '{}', skills text[] NOT NULL DEFAULT '{}', joined_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id), updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(team_id,user_id),
  CHECK(agent_id = user_id)
);
CREATE FUNCTION normalize_team_member() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  NEW.user_id := COALESCE(NEW.user_id, NEW.agent_id);
  NEW.agent_id := NEW.user_id;
  RETURN NEW;
END $$;
CREATE TRIGGER normalize_team_member BEFORE INSERT OR UPDATE ON team_members FOR EACH ROW EXECUTE FUNCTION normalize_team_member();
CREATE TABLE team_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE, start_time timestamptz NOT NULL, end_time timestamptz NOT NULL,
  created_by uuid REFERENCES auth.users(id), updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(end_time > start_time)
);
CREATE TABLE team_metrics (
  team_id uuid PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  average_response_time numeric NOT NULL DEFAULT 0, average_resolution_time numeric NOT NULL DEFAULT 0,
  customer_satisfaction_score numeric NOT NULL DEFAULT 0, open_tickets integer NOT NULL DEFAULT 0,
  resolved_tickets integer NOT NULL DEFAULT 0, period timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE team_metrics_history (LIKE team_metrics INCLUDING DEFAULTS);
ALTER TABLE team_metrics_history ADD COLUMN id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ADD COLUMN timestamp timestamptz NOT NULL DEFAULT now(), ADD FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE;
CREATE TABLE agent_metrics (
  user_id uuid PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE, tickets_resolved integer NOT NULL DEFAULT 0,
  average_response_time numeric NOT NULL DEFAULT 0, average_resolution_time numeric NOT NULL DEFAULT 0,
  customer_satisfaction_score numeric NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE agent_metrics_history (LIKE agent_metrics INCLUDING DEFAULTS);
ALTER TABLE agent_metrics_history ADD COLUMN id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ADD COLUMN timestamp timestamptz NOT NULL DEFAULT now(), ADD FOREIGN KEY(user_id) REFERENCES agents(id) ON DELETE CASCADE;

CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, description text,
  permissions text[] NOT NULL DEFAULT '{}', is_system boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id), updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, description text,
  created_by uuid REFERENCES auth.users(id), updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE, permission text,
  created_by uuid REFERENCES auth.users(id), updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role_id,permission_id), UNIQUE(role_id,permission), CHECK(permission IS NOT NULL OR permission_id IS NOT NULL)
);
CREATE TABLE user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, role_id uuid NOT NULL REFERENCES roles(id),
  role text, custom_permissions text[] NOT NULL DEFAULT '{}', assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE article_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE, helpful boolean NOT NULL, comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE article_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, type text NOT NULL CHECK(type IN ('view','helpful','not_helpful')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE article_metadata (
  article_id uuid PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE, views integer NOT NULL DEFAULT 0,
  helpful_count integer NOT NULL DEFAULT 0, not_helpful_count integer NOT NULL DEFAULT 0,
  last_updated timestamptz NOT NULL DEFAULT now(), published_at timestamptz
);
CREATE TABLE ticket_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  field text NOT NULL, old_value text, new_value text, reason text, created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES messages(id) ON DELETE CASCADE, file_name text NOT NULL,
  file_size bigint, file_type text, file_url text NOT NULL, created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE status_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agents(id), notification_type text NOT NULL, message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE application_settings (key text PRIMARY KEY, value jsonb NOT NULL);

-- Compatibility names share the same rows. Invoker views preserve the base tables' RLS.
CREATE VIEW knowledge_articles WITH (security_invoker=true) AS SELECT * FROM articles;
CREATE VIEW knowledge_categories WITH (security_invoker=true) AS SELECT *, order_index AS "order" FROM categories;
CREATE VIEW custom_fields WITH (security_invoker=true) AS SELECT * FROM custom_field_definitions;
CREATE VIEW users WITH (security_invoker=true) AS
  SELECT id,name,email,avatar,avatar AS avatar_url,'customer'::text AS role,is_active,company,created_by,updated_by,created_at,updated_at FROM customers
  UNION ALL SELECT id,name,email,avatar,COALESCE(avatar_url,avatar),role,is_active,NULL::text,NULL::uuid,NULL::uuid,created_at,updated_at FROM agents;
CREATE VIEW ticket_comments WITH (security_invoker=true) AS
  SELECT id,ticket_id,content,author_id,author_id AS created_by,author_type,is_internal,created_at,updated_at FROM messages;
CREATE VIEW ticket_status_history WITH (security_invoker=true) AS
  SELECT id,ticket_id,from_status,to_status,changed_by AS agent_id,reason,automation_triggered,created_at FROM status_history;
ALTER VIEW message_authors SET (security_invoker=true);

-- Signup metadata is untrusted. Only server-maintained app_metadata may mark a staff identity.
CREATE FUNCTION handle_new_auth_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF COALESCE(NEW.raw_app_meta_data->>'staff','false') <> 'true'
     AND NOT EXISTS(SELECT 1 FROM public.agents WHERE id=NEW.id) THEN
    INSERT INTO public.customers(id,email,name,company)
    VALUES(NEW.id,NEW.email,COALESCE(NULLIF(NEW.raw_user_meta_data->>'name',''),NULLIF(NEW.raw_user_meta_data->>'full_name',''),split_part(NEW.email,'@',1)),NEW.raw_user_meta_data->>'company')
    ON CONFLICT(id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- One active pause per ticket, even if two staff requests arrive concurrently.
CREATE UNIQUE INDEX sla_pauses_one_active_per_ticket ON sla_pauses(ticket_id) WHERE resumed_at IS NULL;
