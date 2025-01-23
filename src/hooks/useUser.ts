import { useEffect, useState } from 'react';
import { useSupabase } from '@/app/providers';

interface User {
  id: string;
  type: 'customer' | 'agent';
  email: string;
  name: string;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useSupabase();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // First check if user is an agent
          const { data: agentData } = await supabase
            .from('agents')
            .select('id, name')
            .eq('id', user.id)
            .single();

          if (agentData) {
            setUser({
              id: user.id,
              type: 'agent',
              email: user.email!,
              name: agentData.name,
            });
            return;
          }

          // If not an agent, check if user is a customer
          const { data: customerData } = await supabase
            .from('customers')
            .select('id, name')
            .eq('id', user.id)
            .single();

          if (customerData) {
            setUser({
              id: user.id,
              type: 'customer',
              email: user.email!,
              name: customerData.name,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [supabase]);

  return { user, loading };
} 