-- Attachment metadata inherits messages' ticket ownership and internal-note RLS.
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.messages ADD CONSTRAINT messages_attachments_array
  CHECK (jsonb_typeof(attachments) = 'array' AND jsonb_array_length(attachments) <= 5);

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('ticket-attachments', 'ticket-attachments', false, 10485760)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit;

-- public here means a customer-visible reply, not a public bucket. Internal-note
-- files have a separate prefix so guessing their path cannot bypass message RLS.
CREATE POLICY ticket_files_staff ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'ticket-attachments' AND public.is_staff())
  WITH CHECK (bucket_id = 'ticket-attachments' AND public.is_staff());
CREATE POLICY ticket_files_customer_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ticket-attachments' AND (storage.foldername(name))[2] = 'public'
    AND EXISTS (SELECT 1 FROM public.tickets t WHERE t.id::text = (storage.foldername(name))[1] AND t.customer_id = auth.uid()));
CREATE POLICY ticket_files_customer_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ticket-attachments' AND (storage.foldername(name))[2] = 'public'
    AND EXISTS (SELECT 1 FROM public.tickets t WHERE t.id::text = (storage.foldername(name))[1] AND t.customer_id = auth.uid()));
-- Allow cleanup after a failed send, without allowing customers to remove staff files.
CREATE POLICY ticket_files_customer_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ticket-attachments' AND owner = auth.uid() AND (storage.foldername(name))[2] = 'public'
    AND EXISTS (SELECT 1 FROM public.tickets t WHERE t.id::text = (storage.foldername(name))[1] AND t.customer_id = auth.uid()));

CREATE FUNCTION public.validate_message_attachments() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE attachment jsonb; expected_prefix text;
BEGIN
  expected_prefix := NEW.ticket_id::text || '/' || CASE WHEN NEW.is_internal THEN 'internal' ELSE 'public' END || '/';
  FOR attachment IN SELECT value FROM jsonb_array_elements(NEW.attachments) LOOP
    IF jsonb_typeof(attachment) <> 'object'
      OR COALESCE(attachment->>'name', '') = ''
      OR COALESCE(attachment->>'path', '') NOT LIKE expected_prefix || '%'
      OR COALESCE(attachment->>'size', '') !~ '^[0-9]+$'
      OR (attachment->>'size')::numeric > 10485760
      OR (attachment->>'size')::numeric <= 0
    THEN RAISE EXCEPTION 'Invalid ticket attachment metadata'; END IF;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_message_attachments BEFORE INSERT OR UPDATE OF attachments, ticket_id, is_internal
  ON public.messages FOR EACH ROW EXECUTE FUNCTION public.validate_message_attachments();
