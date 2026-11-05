-- Create the increment_article_feedback function
CREATE OR REPLACE FUNCTION public.increment_article_feedback(
  article_id UUID,
  feedback_type TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get the current user's ID
  current_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to provide feedback';
  END IF;

  -- Insert a new rating with a score of 5 for helpful and 1 for not helpful
  INSERT INTO article_ratings (
    article_id,
    user_id,
    rating,
    feedback
  )
  VALUES (
    article_id,
    current_user_id,
    CASE 
      WHEN feedback_type = 'helpful' THEN 5
      ELSE 1
    END,
    feedback_type
  );

  -- Update the metadata counts in the articles table
  UPDATE articles a
  SET metadata = jsonb_set(
    jsonb_set(
      a.metadata,
      '{helpfulCount}',
      (
        SELECT COUNT(*)::text::jsonb
        FROM article_ratings ar
        WHERE ar.article_id = a.id
        AND ar.rating = 5
      )
    ),
    '{notHelpfulCount}',
    (
      SELECT COUNT(*)::text::jsonb
      FROM article_ratings ar
      WHERE ar.article_id = a.id
      AND ar.rating = 1
    )
  )
  WHERE a.id = article_id;
END;
$$;

-- Add comment to the function
COMMENT ON FUNCTION public.increment_article_feedback IS 'Records article feedback in article_ratings using the current user ID and updates the counts in articles metadata';

-- Down Migration
-- Create a separate file for rolling back changes
-- supabase/migrations/20240327000000_create_increment_article_feedback_down.sql
-- DROP FUNCTION IF EXISTS public.increment_article_feedback(UUID, TEXT); 