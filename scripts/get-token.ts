import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://tnvxhvwqxhxkwzxcpxzj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRudnhodndxeGh4a3d6eGNweHpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk4NTI1NzAsImV4cCI6MjAyNTQyODU3MH0.Iq9Gj5Zz7_RMpWJ0Lw-Wz_N5fZKVdGGDhZvI0Kp_FQE';

async function getToken() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Sign in with email and UUID as password
  const { data: { session }, error } = await supabase.auth.signInWithPassword({
    email: 'dangilles@outlook.com',
    password: '8a7923a3-87da-4ad7-91c2-92504d7b31d1'
  });

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  if (session) {
    console.log('Session token:', session.access_token);
  }
}

getToken().catch(console.error); 