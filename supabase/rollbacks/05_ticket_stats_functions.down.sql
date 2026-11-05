-- Drop all ticket stats functions
DROP FUNCTION IF EXISTS get_ticket_counts(timestamp, timestamp);
DROP FUNCTION IF EXISTS get_resolution_times(timestamp, timestamp);
DROP FUNCTION IF EXISTS get_sla_stats(timestamp, timestamp);
DROP FUNCTION IF EXISTS get_ticket_volume_trends(timestamp, timestamp);
DROP FUNCTION IF EXISTS get_agent_metrics(timestamp, timestamp); 