-- Create a function to execute dynamic SQL with parameters
CREATE OR REPLACE FUNCTION execute_sql(query_text text, query_params jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  dynamic_query text;
  param_value text;
  i integer;
BEGIN
  -- Start with the base query
  dynamic_query := query_text;
  
  -- Replace each $n parameter with the actual value from jsonb array
  FOR i IN 0..jsonb_array_length(query_params) - 1 LOOP
    param_value := query_params->i;
    -- Remove quotes from the jsonb text value
    param_value := trim(both '"' from param_value::text);
    -- Replace the parameter placeholder
    dynamic_query := replace(dynamic_query, '$' || (i + 1)::text, quote_literal(param_value));
  END LOOP;

  -- Execute the query and convert results to JSON
  EXECUTE format('SELECT json_agg(row_to_json(t)) FROM (%s) t', dynamic_query)
    INTO result;
    
  -- Return empty array if null
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$; 