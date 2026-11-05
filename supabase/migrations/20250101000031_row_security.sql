-- Remove the arbitrary-SQL endpoint, including old deployments that kept it for API callers.
DROP FUNCTION IF EXISTS public.execute_sql(text);
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;

-- These helpers only answer questions about the caller. They avoid recursive agents policies.
CREATE FUNCTION is_staff() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT EXISTS(SELECT 1 FROM public.agents WHERE id=auth.uid() AND is_active AND role IN ('admin','agent','supervisor'));
$$;
CREATE FUNCTION is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT EXISTS(SELECT 1 FROM public.agents WHERE id=auth.uid() AND is_active AND role='admin');
$$;
CREATE FUNCTION can_access_ticket(p_ticket_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
  SELECT EXISTS(SELECT 1 FROM public.tickets WHERE id=p_ticket_id AND (customer_id=auth.uid() OR public.is_staff()));
$$;

-- Start every public table with a deny-by-default boundary; replace earlier permissive policies.
DO $$ DECLARE t record; p record; BEGIN
  FOR p IN SELECT tablename,policyname FROM pg_policies WHERE schemaname='public' LOOP
    EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,p.tablename);
  END LOOP;
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t.tablename);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon',t.tablename);
    EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO authenticated',t.tablename);
    EXECUTE format('GRANT ALL ON public.%I TO service_role',t.tablename);
  END LOOP;
END $$;
GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated,service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
-- Prevent future objects from inheriting Supabase's broad anonymous grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC,anon,authenticated;

CREATE POLICY customers_select ON customers FOR SELECT TO authenticated USING(id=auth.uid() OR is_staff());
CREATE POLICY customers_insert ON customers FOR INSERT TO authenticated WITH CHECK(id=auth.uid() AND NOT is_staff());
CREATE POLICY customers_update ON customers FOR UPDATE TO authenticated USING(id=auth.uid() OR is_admin()) WITH CHECK(id=auth.uid() OR is_admin());
CREATE POLICY customers_delete ON customers FOR DELETE TO authenticated USING(is_admin());
CREATE POLICY agents_select ON agents FOR SELECT TO authenticated USING(is_staff());
CREATE POLICY agents_admin ON agents FOR ALL TO authenticated USING(is_admin()) WITH CHECK(is_admin());

CREATE POLICY tickets_select ON tickets FOR SELECT TO authenticated USING(customer_id=auth.uid() OR is_staff());
CREATE POLICY tickets_insert ON tickets FOR INSERT TO authenticated WITH CHECK(is_staff() OR (
  customer_id=auth.uid() AND assignee_id IS NULL AND team_id IS NULL AND sla_config_id IS NULL
  AND NOT is_archived AND status='open' AND (created_by IS NULL OR created_by=auth.uid())
));
CREATE POLICY tickets_update ON tickets FOR UPDATE TO authenticated USING(customer_id=auth.uid() OR is_staff()) WITH CHECK(customer_id=auth.uid() OR is_staff());
CREATE POLICY tickets_delete ON tickets FOR DELETE TO authenticated USING(is_admin());
CREATE FUNCTION protect_ticket_work_fields() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_staff() AND (
    NEW.customer_id IS DISTINCT FROM OLD.customer_id OR NEW.assignee_id IS DISTINCT FROM OLD.assignee_id
    OR NEW.team_id IS DISTINCT FROM OLD.team_id OR NEW.sla_config_id IS DISTINCT FROM OLD.sla_config_id
    OR NEW.is_archived IS DISTINCT FROM OLD.is_archived OR NEW.status IS DISTINCT FROM OLD.status
    OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN RAISE EXCEPTION 'Only staff may change ticket ownership, assignment or workflow'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_ticket_work_fields BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION protect_ticket_work_fields();
CREATE OR REPLACE FUNCTION update_updated_at_and_by_column() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN NEW.updated_at:=now(); NEW.updated_by:=auth.uid(); RETURN NEW; END $$;

CREATE POLICY messages_select ON messages FOR SELECT TO authenticated USING(is_staff() OR (NOT is_internal AND can_access_ticket(ticket_id)));
CREATE POLICY messages_insert ON messages FOR INSERT TO authenticated WITH CHECK(
  can_access_ticket(ticket_id) AND author_id=auth.uid() AND (
    (is_staff() AND author_type='agent') OR (author_type='customer' AND NOT is_internal)
  )
);
CREATE POLICY messages_update ON messages FOR UPDATE TO authenticated USING(author_id=auth.uid() AND can_access_ticket(ticket_id))
  WITH CHECK(author_id=auth.uid() AND can_access_ticket(ticket_id) AND (is_staff() OR (author_type='customer' AND NOT is_internal)));
CREATE POLICY messages_delete ON messages FOR DELETE TO authenticated USING(is_admin());
CREATE POLICY message_attachments_select ON message_attachments FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM messages m WHERE m.id=message_id));
CREATE POLICY message_attachments_insert ON message_attachments FOR INSERT TO authenticated WITH CHECK(EXISTS(SELECT 1 FROM messages m WHERE m.id=message_id AND m.author_id=auth.uid()));
CREATE POLICY ticket_attachments_select ON ticket_attachments FOR SELECT TO authenticated USING(can_access_ticket(ticket_id) AND (comment_id IS NULL OR EXISTS(SELECT 1 FROM messages m WHERE m.id=comment_id AND m.ticket_id=ticket_attachments.ticket_id)));
CREATE POLICY ticket_attachments_insert ON ticket_attachments FOR INSERT TO authenticated WITH CHECK(created_by=auth.uid() AND can_access_ticket(ticket_id) AND (comment_id IS NULL OR EXISTS(SELECT 1 FROM messages m WHERE m.id=comment_id AND m.ticket_id=ticket_attachments.ticket_id AND m.author_id=auth.uid())));

CREATE POLICY shipments_select ON shipments FOR SELECT TO authenticated USING(customer_id=auth.uid() OR is_staff());
CREATE POLICY shipments_insert ON shipments FOR INSERT TO authenticated WITH CHECK(is_staff() OR (customer_id=auth.uid() AND status IN ('quote_requested','quote_accepted') AND (created_by IS NULL OR created_by=auth.uid()) AND (quote_id IS NULL OR EXISTS(SELECT 1 FROM tickets t WHERE t.id=quote_id AND t.customer_id=auth.uid()))));
CREATE POLICY shipments_update ON shipments FOR UPDATE TO authenticated USING(is_staff()) WITH CHECK(is_staff());
CREATE POLICY shipments_delete ON shipments FOR DELETE TO authenticated USING(is_admin());
CREATE POLICY shipment_events_select ON shipment_events FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM shipments s WHERE s.id=shipment_id));
CREATE POLICY shipment_events_insert ON shipment_events FOR INSERT TO authenticated WITH CHECK(is_staff() AND created_by=auth.uid());
-- Creating a shipment records its initial event atomically, without allowing fabricated customer events.
ALTER FUNCTION create_initial_shipment_event() SECURITY DEFINER;
ALTER FUNCTION create_initial_shipment_event() SET search_path=public,pg_temp;
ALTER FUNCTION create_shipment_status_event() SECURITY DEFINER;
ALTER FUNCTION create_shipment_status_event() SET search_path=public,pg_temp;

CREATE POLICY articles_public ON articles FOR SELECT TO anon,authenticated USING(status='published' OR is_staff());
CREATE POLICY articles_staff ON articles FOR ALL TO authenticated USING(is_staff()) WITH CHECK(is_staff());
CREATE POLICY categories_public ON categories FOR SELECT TO anon,authenticated USING(true);
CREATE POLICY categories_staff ON categories FOR ALL TO authenticated USING(is_staff()) WITH CHECK(is_staff());
GRANT SELECT ON articles,categories,knowledge_articles,knowledge_categories TO anon;
CREATE POLICY article_ratings_select ON article_ratings FOR SELECT TO authenticated USING(user_id=auth.uid() OR is_staff());
CREATE POLICY article_ratings_insert ON article_ratings FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() AND EXISTS(SELECT 1 FROM articles a WHERE a.id=article_id AND a.status='published'));
CREATE POLICY article_ratings_update ON article_ratings FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid() AND EXISTS(SELECT 1 FROM articles a WHERE a.id=article_id AND a.status='published'));
CREATE POLICY article_feedback_select ON article_feedback FOR SELECT TO authenticated USING(customer_id=auth.uid() OR is_staff());
CREATE POLICY article_feedback_insert ON article_feedback FOR INSERT TO authenticated WITH CHECK(customer_id=auth.uid() AND EXISTS(SELECT 1 FROM articles a WHERE a.id=article_id AND a.status='published'));
CREATE POLICY article_interactions_select ON article_interactions FOR SELECT TO authenticated USING(user_id=auth.uid() OR is_staff());
CREATE POLICY article_interactions_insert ON article_interactions FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() AND EXISTS(SELECT 1 FROM articles a WHERE a.id=article_id AND a.status='published'));

-- Work configuration is visible to staff. Only admins may manage identity and permission data.
DO $$ DECLARE n text; BEGIN
  FOREACH n IN ARRAY ARRAY['roles','permissions','role_permissions','teams','team_members','team_schedules','custom_field_definitions','sla_configs','application_settings'] LOOP
    EXECUTE format('CREATE POLICY staff_select ON public.%I FOR SELECT TO authenticated USING(public.is_staff())',n);
    EXECUTE format('CREATE POLICY admin_manage ON public.%I FOR ALL TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin())',n);
  END LOOP;
  FOREACH n IN ARRAY ARRAY['tags','ticket_tags','ticket_followers','ticket_custom_fields','ticket_snapshots','status_history','sla_states','sla_status','sla_pauses','audit_logs','search_analytics','failed_searches','article_versions','article_metadata','team_metrics','team_metrics_history','agent_metrics','agent_metrics_history','embeddings','ticket_history','status_notifications'] LOOP
    EXECUTE format('CREATE POLICY staff_manage ON public.%I FOR ALL TO authenticated USING(public.is_staff()) WITH CHECK(public.is_staff())',n);
  END LOOP;
END $$;
CREATE POLICY user_roles_select ON user_roles FOR SELECT TO authenticated USING(user_id=auth.uid() OR is_admin());
CREATE POLICY user_roles_admin ON user_roles FOR ALL TO authenticated USING(is_admin()) WITH CHECK(is_admin());
CREATE POLICY ticket_relationships_staff ON ticket_relationships FOR ALL TO authenticated USING(is_staff()) WITH CHECK(is_staff());
CREATE POLICY ticket_custom_fields_customer_select ON ticket_custom_fields FOR SELECT TO authenticated USING(can_access_ticket(ticket_id));
CREATE POLICY ticket_custom_fields_customer_insert ON ticket_custom_fields FOR INSERT TO authenticated WITH CHECK(can_access_ticket(ticket_id));
CREATE POLICY ticket_custom_fields_customer_update ON ticket_custom_fields FOR UPDATE TO authenticated USING(can_access_ticket(ticket_id)) WITH CHECK(can_access_ticket(ticket_id));
CREATE POLICY custom_field_definitions_customer_select ON custom_field_definitions FOR SELECT TO authenticated USING(is_active);

-- Views must not retain the old anonymous grants or bypass base-table policies.
REVOKE ALL ON users,ticket_comments,ticket_status_history,message_authors,custom_fields,search_suggestions FROM PUBLIC,anon;
GRANT SELECT ON users,message_authors,search_suggestions TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON knowledge_articles,knowledge_categories,custom_fields,ticket_comments,ticket_status_history TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
-- Materialized search suggestions contain user search terms, so only staff may use an RPC over source data.
REVOKE ALL ON search_suggestions FROM authenticated;

-- Internal audit entries derive the identity from auth.uid(), never client-controlled settings.
CREATE OR REPLACE FUNCTION audit_log_changes() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE old_data jsonb; new_data jsonb; actor uuid; actor_kind text; entity uuid;
BEGIN
  IF TG_OP<>'INSERT' THEN old_data:=to_jsonb(OLD); END IF;
  IF TG_OP<>'DELETE' THEN new_data:=to_jsonb(NEW); END IF;
  actor:=auth.uid();
  actor_kind:=CASE WHEN actor IS NULL THEN 'system' WHEN EXISTS(SELECT 1 FROM agents WHERE id=actor) THEN 'agent' ELSE 'customer' END;
  entity:=COALESCE((COALESCE(new_data,old_data)->>'id')::uuid,(COALESCE(new_data,old_data)->>'ticket_id')::uuid);
  INSERT INTO audit_logs(entity_type,entity_id,action,actor_id,actor_type,changes,metadata)
  VALUES(TG_TABLE_NAME,entity,TG_OP,COALESCE(actor,'00000000-0000-0000-0000-000000000000'::uuid),actor_kind,jsonb_build_object('old',old_data,'new',new_data),'{}');
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
ALTER FUNCTION initialize_sla_tracking() SECURITY DEFINER;
ALTER FUNCTION initialize_sla_tracking() SET search_path=public,pg_temp;

-- Customers may inspect the timing data for their own tickets, but cannot change SLA settings.
CREATE POLICY sla_configs_customer_select ON sla_configs FOR SELECT TO authenticated USING(
  EXISTS(SELECT 1 FROM tickets t WHERE t.sla_config_id=sla_configs.id AND t.customer_id=auth.uid())
);
CREATE POLICY sla_states_customer_select ON sla_states FOR SELECT TO authenticated USING(can_access_ticket(ticket_id));
CREATE POLICY sla_status_customer_select ON sla_status FOR SELECT TO authenticated USING(can_access_ticket(ticket_id));
CREATE POLICY sla_pauses_customer_select ON sla_pauses FOR SELECT TO authenticated USING(can_access_ticket(ticket_id));
