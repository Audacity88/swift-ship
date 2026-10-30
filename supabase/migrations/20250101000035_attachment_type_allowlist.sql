-- Only supported document/image/archive types may enter the private bucket.
UPDATE storage.buckets SET allowed_mime_types = ARRAY[
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/heic',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/zip',
  'application/x-zip-compressed'
]::text[] WHERE id = 'ticket-attachments';

-- Validate both extension and MIME; a renamed HTML/SVG/script/executable is not
-- an allowed attachment merely because one of its two fields looks harmless.
CREATE FUNCTION public.ticket_attachment_type_allowed(filename text, mime text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$
  SELECT COALESCE(filename !~ '[[:cntrl:]/]' AND position(chr(92) in filename) = 0
    AND EXISTS (SELECT 1 FROM (VALUES
    ('png', 'image/png'),
    ('jpg', 'image/jpeg'),
    ('jpeg', 'image/jpeg'),
    ('gif', 'image/gif'),
    ('webp', 'image/webp'),
    ('heic', 'image/heic'),
    ('pdf', 'application/pdf'),
    ('txt', 'text/plain'),
    ('csv', 'text/csv'),
    ('doc', 'application/msword'),
    ('docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    ('xls', 'application/vnd.ms-excel'),
    ('xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
    ('ppt', 'application/vnd.ms-powerpoint'),
    ('pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'),
    ('odt', 'application/vnd.oasis.opendocument.text'),
    ('ods', 'application/vnd.oasis.opendocument.spreadsheet'),
    ('zip', 'application/zip'),
    ('zip', 'application/x-zip-compressed')
    ) AS allowed(extension, content_type)
    WHERE lower(filename) ~ ('[.]' || allowed.extension || '$')
      AND lower(mime) = allowed.content_type), false);
$$;

CREATE OR REPLACE FUNCTION public.validate_message_attachments() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE attachment jsonb; expected_prefix text;
BEGIN
  expected_prefix := NEW.ticket_id::text || '/' || CASE WHEN NEW.is_internal THEN 'internal' ELSE 'public' END || '/';
  FOR attachment IN SELECT value FROM jsonb_array_elements(NEW.attachments) LOOP
    IF jsonb_typeof(attachment) <> 'object'
      OR COALESCE(attachment->>'name', '') = ''
      OR NOT public.ticket_attachment_type_allowed(attachment->>'name', attachment->>'type')
      OR NOT public.ticket_attachment_type_allowed(regexp_replace(attachment->>'path', '^.*/', ''), attachment->>'type')
      OR COALESCE(attachment->>'path', '') NOT LIKE expected_prefix || '%'
      OR COALESCE(attachment->>'size', '') !~ '^[0-9]+$'
      OR (attachment->>'size')::numeric > 10485760
      OR (attachment->>'size')::numeric <= 0
    THEN RAISE EXCEPTION 'Invalid ticket attachment metadata: unsupported name, type, path or size'; END IF;
  END LOOP;
  RETURN NEW;
END $$;
