import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Use only the caller JWT. A service-role key must never authorize chat work.
export async function resolveCaller(req: Request) {
  const authorization = req.headers.get('Authorization');
  const token = authorization?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return null;
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return { supabase, user, token };
}
