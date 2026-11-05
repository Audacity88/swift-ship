-- Run against the local Supabase database as postgres. Fixtures are rolled back.
\set ON_ERROR_STOP on
BEGIN;
-- Every assertion below is scoped to these transaction-owned fixtures. Existing
-- application tickets, customers, articles and SLA data do not affect counts.
INSERT INTO sla_configs(id,name,first_response_time,resolution_time) VALUES
('40000000-0000-4000-8000-000000000001','RLS fixture SLA A',60,480),
('40000000-0000-4000-8000-000000000002','RLS fixture SLA B',120,960);
INSERT INTO categories(id,name,slug) VALUES
('50000000-0000-4000-8000-000000000001','RLS fixture category','rls-transaction-fixture');
INSERT INTO articles(id,title,slug,content,category_id,status) VALUES
('60000000-0000-4000-8000-000000000001','Published fixture','rls-transaction-published','Fixture','50000000-0000-4000-8000-000000000001','published'),
('60000000-0000-4000-8000-000000000002','Draft fixture','rls-transaction-draft','Fixture','50000000-0000-4000-8000-000000000001','draft');
INSERT INTO auth.users(id,email,raw_user_meta_data,raw_app_meta_data) VALUES
('10000000-0000-4000-8000-000000000001','rls-customer-a@example.invalid','{"name":"Customer A","role":"admin","type":"agent"}','{}'),
('10000000-0000-4000-8000-000000000002','rls-customer-b@example.invalid','{"name":"Customer B"}','{}'),
('10000000-0000-4000-8000-000000000003','rls-admin@example.invalid','{"name":"Admin"}','{"staff":true}');
INSERT INTO agents(id,name,email,role) VALUES('10000000-0000-4000-8000-000000000003','Admin','rls-admin@example.invalid','admin');
INSERT INTO tickets(id,title,description,customer_id,sla_config_id) VALUES
('20000000-0000-4000-8000-000000000001','Ticket A','Original A','10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000002','Ticket B','Original B','10000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000002');
INSERT INTO messages(ticket_id,content,author_id,author_type,is_internal) VALUES
('20000000-0000-4000-8000-000000000001','Internal staff note','10000000-0000-4000-8000-000000000003','agent',true);
INSERT INTO sla_pauses(ticket_id,reason,created_by) VALUES
('20000000-0000-4000-8000-000000000001','Waiting for customer','10000000-0000-4000-8000-000000000003'),
('20000000-0000-4000-8000-000000000002','Other customer','10000000-0000-4000-8000-000000000003');
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity) THEN RAISE EXCEPTION 'Public table without RLS'; END IF;
  IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='execute_sql') THEN RAISE EXCEPTION 'execute_sql still exists'; END IF;
  IF (SELECT count(*) FROM customers WHERE id IN ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002'))<>2 THEN RAISE EXCEPTION 'Signup trigger did not create profiles'; END IF;
  IF EXISTS(SELECT 1 FROM customers WHERE id='10000000-0000-4000-8000-000000000003') THEN RAISE EXCEPTION 'Staff signup created customer'; END IF;
  IF EXISTS(SELECT 1 FROM agents WHERE id='10000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Untrusted metadata granted admin'; END IF;
  RAISE NOTICE 'PASS: all public tables have RLS, execute_sql absent, signup creates customer and ignores role spoofing';
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN PERFORM count(*) FROM tickets; RAISE EXCEPTION 'Anon read tickets'; EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: anon cannot read tickets'; END;
  BEGIN PERFORM count(*) FROM customers; RAISE EXCEPTION 'Anon read customers'; EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: anon cannot read customers'; END;
  BEGIN PERFORM count(*) FROM agents; RAISE EXCEPTION 'Anon read agents'; EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: anon cannot read agents'; END;
  IF (SELECT count(*) FROM articles WHERE id='60000000-0000-4000-8000-000000000001')<>1 THEN RAISE EXCEPTION 'Published KB missing'; END IF;
  IF EXISTS(SELECT 1 FROM articles WHERE id='60000000-0000-4000-8000-000000000002') THEN RAISE EXCEPTION 'Anon read unpublished KB'; END IF;
  RAISE NOTICE 'PASS: anon can read published knowledge articles';
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","email":"rls-customer-a@example.invalid"}',true) IS NOT NULL AS customer_claims_set;
DO $$ DECLARE changed integer; BEGIN
  IF auth.uid()<>'10000000-0000-4000-8000-000000000001'::uuid THEN RAISE EXCEPTION 'Invalid test identity'; END IF;
  IF (SELECT count(*) FROM customers WHERE id IN ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002'))<>1 OR (SELECT count(*) FROM tickets WHERE id IN ('20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002'))<>1 THEN RAISE EXCEPTION 'Cross-customer row disclosure'; END IF;
  IF EXISTS(SELECT 1 FROM messages WHERE ticket_id IN ('20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002') AND is_internal) THEN RAISE EXCEPTION 'Internal message disclosure'; END IF;
  UPDATE customers SET name='Updated own name' WHERE id=auth.uid();
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed<>1 THEN RAISE EXCEPTION 'Own profile update failed'; END IF;
  BEGIN INSERT INTO agents(id,name,email,role) VALUES(auth.uid(),'Attacker','attacker@example.invalid','admin'); RAISE EXCEPTION 'Customer inserted admin'; EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: customer cannot insert an agent/admin'; END;
  UPDATE agents SET role='admin' WHERE id=auth.uid();
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed<>0 THEN RAISE EXCEPTION 'Customer updated agents'; END IF;
  BEGIN INSERT INTO user_roles(user_id,role_id) VALUES(auth.uid(),gen_random_uuid()); RAISE EXCEPTION 'Customer assigned role'; EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: customer cannot assign roles'; END;
  UPDATE tickets SET description='Hijacked' WHERE id='20000000-0000-4000-8000-000000000002';
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed<>0 THEN RAISE EXCEPTION 'Customer updated other ticket'; END IF;
  BEGIN UPDATE tickets SET assignee_id='10000000-0000-4000-8000-000000000003' WHERE id='20000000-0000-4000-8000-000000000001'; RAISE EXCEPTION 'Customer changed assignment';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Only staff may change ticket ownership, assignment or workflow' THEN RAISE; END IF; RAISE NOTICE 'PASS: customer cannot change ticket assignment'; END;
  INSERT INTO messages(ticket_id,content,author_id,author_type) VALUES('20000000-0000-4000-8000-000000000001','Own reply',auth.uid(),'customer');
  BEGIN INSERT INTO messages(ticket_id,content,author_id,author_type) VALUES('20000000-0000-4000-8000-000000000002','Cross-ticket reply',auth.uid(),'customer'); RAISE EXCEPTION 'Customer replied to other ticket'; EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: customer cannot message another customer ticket'; END;
  BEGIN INSERT INTO messages(ticket_id,content,author_id,author_type,is_internal) VALUES('20000000-0000-4000-8000-000000000001','Forged internal note',auth.uid(),'customer',true); RAISE EXCEPTION 'Customer inserted internal note'; EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: customer cannot write internal messages'; END;
  BEGIN PERFORM execute_status_transition('20000000-0000-4000-8000-000000000001','closed',NULL,auth.uid()); RAISE EXCEPTION 'Customer used staff RPC'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Staff access required' THEN RAISE; END IF; RAISE NOTICE 'PASS: customer cannot invoke staff status transition'; END;
  IF (SELECT count(*) FROM sla_configs WHERE id IN ('40000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002'))<>1 OR (SELECT count(*) FROM sla_pauses WHERE ticket_id IN ('20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002'))<>1 OR (SELECT count(*) FROM sla_status WHERE ticket_id IN ('20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002'))<>1 THEN RAISE EXCEPTION 'Customer SLA visibility wrong'; END IF;
  BEGIN INSERT INTO sla_pauses(ticket_id,reason,created_by) VALUES('20000000-0000-4000-8000-000000000001','Forged pause',auth.uid()); RAISE EXCEPTION 'Customer inserted pause'; EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: customer reads own SLA config/pauses but cannot pause tickets'; END;
  INSERT INTO shipments(id,quote_id,customer_id,type,status,origin,destination,tracking_number,created_by) VALUES('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',auth.uid(),'full_truckload','quote_accepted','Origin','Destination','RLS-SMOKE',auth.uid());
  UPDATE shipments SET status='delivered' WHERE id='30000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed<>0 THEN RAISE EXCEPTION 'Customer modified fulfillment status'; END IF;
  BEGIN INSERT INTO shipments(customer_id,type,status,origin,destination,tracking_number) VALUES(auth.uid(),'full_truckload','delivered','Origin','Destination','RLS-FORGED'); RAISE EXCEPTION 'Customer fabricated delivered shipment'; EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: customer can create own shipment but cannot fabricate fulfillment status'; END;
  RAISE NOTICE 'PASS: customer reads own rows, updates own profile, and sends own reply';
END $$;
SELECT set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}',true) IS NOT NULL AS admin_claims_set;
DO $$ BEGIN
  IF (SELECT count(*) FROM tickets WHERE id IN ('20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002'))<>2 THEN RAISE EXCEPTION 'Admin work visibility failed'; END IF;
  PERFORM execute_status_transition('20000000-0000-4000-8000-000000000001','in_progress','SQL smoke',auth.uid());
  IF NOT EXISTS(SELECT 1 FROM tickets WHERE id='20000000-0000-4000-8000-000000000001' AND status='in_progress') THEN RAISE EXCEPTION 'Admin transition failed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM status_history WHERE ticket_id='20000000-0000-4000-8000-000000000001' AND to_status='in_progress') THEN RAISE EXCEPTION 'History missing'; END IF;
  BEGIN PERFORM execute_status_transition('20000000-0000-4000-8000-000000000001','resolved',NULL,'10000000-0000-4000-8000-000000000001');
    RAISE EXCEPTION 'Status RPC accepted spoofed agent'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Staff access required' THEN RAISE; END IF; RAISE NOTICE 'PASS: status RPC rejects spoofed agent identity'; END;
  RAISE NOTICE 'PASS: admin reads work data and transitions open to in_progress with history';
END $$;
RESET ROLE;
ROLLBACK;
