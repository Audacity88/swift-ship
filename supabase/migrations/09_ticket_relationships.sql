-- Create enum for relationship types
CREATE TYPE ticket_relationship_type AS ENUM ('problem', 'incident', 'related');

-- Create ticket relationships table
CREATE TABLE IF NOT EXISTS public.ticket_relationships (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    related_ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    relationship_type ticket_relationship_type NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT ticket_relationships_unique UNIQUE (ticket_id, related_ticket_id, relationship_type)
);

-- Add RLS policies
ALTER TABLE public.ticket_relationships ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access to authenticated users"
    ON public.ticket_relationships
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow insert access to agents and admins
CREATE POLICY "Allow insert access to agents and admins"
    ON public.ticket_relationships
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.agents
            WHERE agents.id = auth.uid()
            AND agents.role IN ('agent', 'admin')
        )
    );

-- Allow update access to agents and admins
CREATE POLICY "Allow update access to agents and admins"
    ON public.ticket_relationships
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.agents
            WHERE agents.id = auth.uid()
            AND agents.role IN ('agent', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.agents
            WHERE agents.id = auth.uid()
            AND agents.role IN ('agent', 'admin')
        )
    );

-- Allow delete access to agents and admins
CREATE POLICY "Allow delete access to agents and admins"
    ON public.ticket_relationships
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.agents
            WHERE agents.id = auth.uid()
            AND agents.role IN ('agent', 'admin')
        )
    );

-- Add indexes for performance
CREATE INDEX ticket_relationships_ticket_id_idx ON public.ticket_relationships(ticket_id);
CREATE INDEX ticket_relationships_related_ticket_id_idx ON public.ticket_relationships(related_ticket_id);
CREATE INDEX ticket_relationships_type_idx ON public.ticket_relationships(relationship_type);

-- Add trigger for updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.ticket_relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 