-- Drop indexes
DROP INDEX IF EXISTS ticket_relationships_ticket_id_idx;
DROP INDEX IF EXISTS ticket_relationships_related_ticket_id_idx;
DROP INDEX IF EXISTS ticket_relationships_type_idx;

-- Drop table
DROP TABLE IF EXISTS public.ticket_relationships;

-- Drop enum
DROP TYPE IF EXISTS ticket_relationship_type; 