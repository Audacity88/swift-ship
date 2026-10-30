-- Get ticket counts
CREATE OR REPLACE FUNCTION get_ticket_counts(start_date timestamp, end_date timestamp)
RETURNS TABLE (
  type text,
  key text,
  count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 'priority' as type, priority::text as key, COUNT(*)::bigint
  FROM tickets
  WHERE NOT is_archived
    AND created_at >= start_date
    AND created_at <= end_date
  GROUP BY priority
  UNION ALL
  SELECT 'status' as type, status::text, COUNT(*)::bigint
  FROM tickets
  WHERE NOT is_archived
    AND created_at >= start_date
    AND created_at <= end_date
  GROUP BY status;
END;
$$ LANGUAGE plpgsql;

-- Get resolution times
CREATE OR REPLACE FUNCTION get_resolution_times(start_date timestamp, end_date timestamp)
RETURNS TABLE (
  priority text,
  avg_hours numeric,
  min_hours numeric,
  max_hours numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    priority::text,
    EXTRACT(epoch FROM AVG(resolved_at - created_at))/3600 as avg_hours,
    EXTRACT(epoch FROM MIN(resolved_at - created_at))/3600 as min_hours,
    EXTRACT(epoch FROM MAX(resolved_at - created_at))/3600 as max_hours
  FROM tickets
  WHERE NOT is_archived
    AND resolved_at IS NOT NULL
    AND created_at >= start_date
    AND created_at <= end_date
  GROUP BY priority;
END;
$$ LANGUAGE plpgsql;

-- Get SLA stats
CREATE OR REPLACE FUNCTION get_sla_stats(start_date timestamp, end_date timestamp)
RETURNS TABLE (
  priority text,
  total bigint,
  response_breached bigint,
  resolution_breached bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.priority::text,
    COUNT(*)::bigint as total,
    COUNT(*) FILTER (WHERE s.response_breached)::bigint as response_breached,
    COUNT(*) FILTER (WHERE s.resolution_breached)::bigint as resolution_breached
  FROM tickets t
  LEFT JOIN sla_states s ON t.id = s.ticket_id
  WHERE NOT t.is_archived
    AND t.created_at >= start_date
    AND t.created_at <= end_date
  GROUP BY t.priority;
END;
$$ LANGUAGE plpgsql;

-- Get ticket volume trends
CREATE OR REPLACE FUNCTION get_ticket_volume_trends(start_date timestamp, end_date timestamp)
RETURNS TABLE (
  date timestamp,
  created bigint,
  resolved bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('day', created_at) as date,
    COUNT(*)::bigint as created,
    COUNT(*) FILTER (WHERE resolved_at IS NOT NULL)::bigint as resolved
  FROM tickets
  WHERE NOT is_archived
    AND created_at >= start_date
    AND created_at <= end_date
  GROUP BY DATE_TRUNC('day', created_at)
  ORDER BY date;
END;
$$ LANGUAGE plpgsql;

-- Get agent metrics
CREATE OR REPLACE FUNCTION get_agent_metrics(start_date timestamp, end_date timestamp)
RETURNS TABLE (
  id uuid,
  name text,
  total_assigned bigint,
  total_resolved bigint,
  avg_resolution_hours numeric,
  sla_breaches bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.name,
    COUNT(*)::bigint as total_assigned,
    COUNT(*) FILTER (WHERE t.resolved_at IS NOT NULL)::bigint as total_resolved,
    EXTRACT(epoch FROM AVG(t.resolved_at - t.created_at))/3600 as avg_resolution_hours,
    COUNT(*) FILTER (WHERE s.response_breached OR s.resolution_breached)::bigint as sla_breaches
  FROM agents a
  LEFT JOIN tickets t ON t.assignee_id = a.id
  LEFT JOIN sla_states s ON t.id = s.ticket_id
  WHERE NOT t.is_archived
    AND t.created_at >= start_date
    AND t.created_at <= end_date
  GROUP BY a.id, a.name;
END;
$$ LANGUAGE plpgsql;
