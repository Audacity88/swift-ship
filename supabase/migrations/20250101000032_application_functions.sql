-- All application RPCs use RLS or explicit caller checks. None accepts SQL text.
CREATE FUNCTION execute_status_transition(p_ticket_id uuid,p_new_status text,p_reason text,p_agent_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE previous_status text;
BEGIN
  IF NOT is_staff() OR p_agent_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Staff access required'; END IF;
  SELECT status INTO previous_status FROM tickets WHERE id=p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket not found'; END IF;
  IF p_new_status NOT IN ('open','in_progress','waiting','resolved','closed') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  IF previous_status=p_new_status THEN RETURN; END IF;
  IF NOT ((previous_status='open' AND p_new_status IN ('in_progress','waiting','resolved','closed'))
    OR (previous_status='in_progress' AND p_new_status IN ('open','waiting','resolved','closed'))
    OR (previous_status='waiting' AND p_new_status IN ('open','in_progress','resolved','closed'))
    OR (previous_status='resolved' AND p_new_status IN ('open','in_progress','closed'))
    OR (previous_status='closed' AND p_new_status='open')) THEN RAISE EXCEPTION 'Invalid status transition'; END IF;
  UPDATE tickets SET status=p_new_status,updated_by=auth.uid(),
    resolved_at=CASE WHEN p_new_status IN ('resolved','closed') THEN COALESCE(resolved_at,now()) ELSE NULL END WHERE id=p_ticket_id;
  INSERT INTO status_history(ticket_id,from_status,to_status,changed_by,reason) VALUES(p_ticket_id,previous_status,p_new_status,auth.uid(),p_reason);
END $$;
CREATE FUNCTION update_ticket_custom_field(p_ticket_id uuid,p_field_id uuid,p_value jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'Staff access required'; END IF;
  INSERT INTO ticket_custom_fields(ticket_id,field_id,value) VALUES(p_ticket_id,p_field_id,p_value)
  ON CONFLICT(ticket_id,field_id) DO UPDATE SET value=excluded.value;
END $$;
CREATE FUNCTION send_status_notification(p_ticket_id uuid,p_agent_id uuid,p_notification_type text,p_message text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'Staff access required'; END IF;
  INSERT INTO status_notifications(ticket_id,agent_id,notification_type,message) VALUES(p_ticket_id,p_agent_id,p_notification_type,p_message);
END $$;
CREATE FUNCTION create_ticket_audit_log(p_ticket_id uuid,p_action text,p_details jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'Staff access required'; END IF;
  INSERT INTO audit_logs(entity_type,entity_id,action,actor_id,actor_type,metadata)
  VALUES('tickets',p_ticket_id,p_action,auth.uid(),'agent',p_details);
END $$;
CREATE FUNCTION set_audit_retention_days(p_days integer) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_days < 1 OR p_days > 3650 THEN RAISE EXCEPTION 'Retention must be between 1 and 3650 days'; END IF;
  INSERT INTO application_settings(key,value) VALUES('audit_retention_days',to_jsonb(p_days)) ON CONFLICT(key) DO UPDATE SET value=excluded.value;
END $$;
CREATE FUNCTION search_period_start(time_range text) RETURNS timestamptz LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT now() - CASE time_range WHEN '30d' THEN interval '30 days' WHEN '90d' THEN interval '90 days' ELSE interval '7 days' END;
$$;
CREATE FUNCTION get_search_analytics(time_range text) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
  SELECT jsonb_build_object('total_searches',count(*),'avg_response_time',COALESCE(avg(execution_time_ms),0),
    'failure_rate',CASE WHEN count(*)=0 THEN 0 ELSE (SELECT count(*) FROM failed_searches WHERE created_at>=search_period_start(time_range))::numeric/count(*) END)
  FROM search_analytics WHERE created_at>=search_period_start(time_range);
$$;
CREATE FUNCTION get_top_search_terms(time_range text,"limit" integer) RETURNS TABLE(term text,count bigint) LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
  SELECT query,count(*) FROM search_analytics WHERE created_at>=search_period_start(time_range) GROUP BY query ORDER BY count(*) DESC LIMIT LEAST(GREATEST("limit",1),100);
$$;
CREATE FUNCTION get_searches_by_day(time_range text) RETURNS TABLE(date date,count bigint) LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
  SELECT created_at::date,count(*) FROM search_analytics WHERE created_at>=search_period_start(time_range) GROUP BY created_at::date ORDER BY created_at::date;
$$;
CREATE FUNCTION match_documents(query_embedding vector(1536),match_threshold float,match_count integer)
RETURNS TABLE(id bigint,title text,content text,url text,similarity float) LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
  SELECT * FROM match_embeddings(query_embedding,match_threshold,LEAST(GREATEST(match_count,1),100));
$$;

CREATE OR REPLACE FUNCTION increment_article_feedback(article_id uuid,feedback_type text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE current_user_id uuid:=auth.uid();
BEGIN
  IF current_user_id IS NULL OR NOT EXISTS(SELECT 1 FROM customers WHERE id=current_user_id) THEN RAISE EXCEPTION 'Customer sign-in required'; END IF;
  IF feedback_type NOT IN ('helpful','not_helpful') THEN RAISE EXCEPTION 'Invalid feedback type'; END IF;
  IF NOT EXISTS(SELECT 1 FROM articles WHERE id=article_id AND status='published') THEN RAISE EXCEPTION 'Published article not found'; END IF;
  INSERT INTO article_ratings(article_id,user_id,rating,is_helpful,feedback)
  VALUES(article_id,current_user_id,CASE WHEN feedback_type='helpful' THEN 5 ELSE 1 END,feedback_type='helpful',feedback_type)
  ON CONFLICT ON CONSTRAINT article_ratings_user_article_key DO UPDATE SET rating=excluded.rating,is_helpful=excluded.is_helpful,feedback=excluded.feedback,updated_at=now();
  UPDATE articles a SET metadata=a.metadata || jsonb_build_object(
    'helpfulCount',(SELECT count(*) FROM article_ratings r WHERE r.article_id=a.id AND r.rating=5),
    'notHelpfulCount',(SELECT count(*) FROM article_ratings r WHERE r.article_id=a.id AND r.rating=1))
  WHERE a.id=increment_article_feedback.article_id;
END $$;
CREATE FUNCTION update_article_metadata(p_article_id uuid,p_type text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign-in required'; END IF;
  IF p_type NOT IN ('views','helpful','not_helpful') THEN RAISE EXCEPTION 'Invalid metadata type'; END IF;
  IF NOT EXISTS(SELECT 1 FROM articles WHERE id=p_article_id AND status='published') THEN RAISE EXCEPTION 'Published article not found'; END IF;
  UPDATE articles a SET metadata=a.metadata || jsonb_build_object(
    'views',(SELECT count(*) FROM article_interactions i WHERE i.article_id=a.id AND i.type='view'),
    'helpfulCount',(SELECT count(*) FROM article_ratings r WHERE r.article_id=a.id AND COALESCE(r.is_helpful,r.rating=5)),
    'notHelpfulCount',(SELECT count(*) FROM article_ratings r WHERE r.article_id=a.id AND NOT COALESCE(r.is_helpful,r.rating=5))) WHERE a.id=p_article_id;
END $$;

-- Functions are private unless explicitly part of the API. Trigger functions stay private.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT EXECUTE ON FUNCTION is_staff() TO anon,authenticated;
GRANT EXECUTE ON FUNCTION is_admin(),can_access_ticket(uuid),uuid_generate_v4(),
  articles_search_vector(text,text,text,text[]),
  execute_status_transition(uuid,text,text,uuid),update_ticket_custom_field(uuid,uuid,jsonb),
  send_status_notification(uuid,uuid,text,text),create_ticket_audit_log(uuid,text,jsonb),set_audit_retention_days(integer),
  search_period_start(text),get_search_analytics(text),get_top_search_terms(text,integer),get_searches_by_day(text),
  get_ticket_counts(timestamp,timestamp),get_resolution_times(timestamp,timestamp),get_sla_stats(timestamp,timestamp),
  get_ticket_volume_trends(timestamp,timestamp),get_agent_metrics(timestamp,timestamp),
  increment_article_feedback(uuid,text),update_article_metadata(uuid,text),
  match_embeddings(vector,float,integer),match_documents(vector,float,integer) TO authenticated;
-- pgvector's operators call extension-owned functions. They are data operators, not application RPCs.
DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_depend d ON d.objid=p.oid AND d.classid='pg_proc'::regclass
    JOIN pg_extension e ON e.oid=d.refobjid WHERE e.extname='vector' AND d.deptype='e' LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.signature);
  END LOOP;
END $$;
