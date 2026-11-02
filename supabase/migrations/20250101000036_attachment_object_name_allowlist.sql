-- Round-4 hardening (N-a): the bucket MIME allowlist only checks the declared
-- Content-Type, so a direct Storage API call could store e.g. `x.html` as
-- text/plain. These RESTRICTIVE policies make every write to the bucket also
-- pass the extension/MIME pair check used for message metadata (migration 35).
-- They apply on top of the existing permissive ownership policies.
CREATE FUNCTION public.ticket_attachment_object_allowed(object_name text, mime text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$
  WITH parts AS (
    SELECT regexp_replace(COALESCE(object_name, ''), '^.*/', '') AS filename,
           NULLIF(btrim(split_part(COALESCE(mime, ''), ';', 1)), '') AS content_type
  )
  SELECT CASE
    -- Storage API rows carry the uploaded Content-Type: name and type must match.
    WHEN parts.content_type IS NOT NULL
      THEN public.ticket_attachment_type_allowed(parts.filename, parts.content_type)
    -- No type recorded yet: the name must still have a supported extension.
    ELSE EXISTS (SELECT 1 FROM unnest(ARRAY[
      'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/heic',
      'application/pdf', 'text/plain', 'text/csv', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.oasis.opendocument.text',
      'application/vnd.oasis.opendocument.spreadsheet',
      'application/zip', 'application/x-zip-compressed'
    ]) AS allowed(content_type)
      WHERE public.ticket_attachment_type_allowed(parts.filename, allowed.content_type))
  END FROM parts;
$$;

CREATE POLICY ticket_files_type_allowlist_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO public
  WITH CHECK (bucket_id <> 'ticket-attachments'
    OR public.ticket_attachment_object_allowed(name, metadata->>'mimetype'));
-- Covers upsert, metadata updates and move/rename to a new object name.
CREATE POLICY ticket_files_type_allowlist_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO public
  USING (true)
  WITH CHECK (bucket_id <> 'ticket-attachments'
    OR public.ticket_attachment_object_allowed(name, metadata->>'mimetype'));
