-- Realtime uses the same SELECT policies as REST. Keep the publication scoped to
-- tables used by the authenticated ticket and conversation subscriptions.
DO $$
DECLARE relation_name text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  FOREACH relation_name IN ARRAY ARRAY['messages', 'tickets'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = relation_name
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', relation_name);
    END IF;
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', relation_name);
  END LOOP;
END $$;
