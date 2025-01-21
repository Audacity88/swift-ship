import { useEffect, useState } from 'react';
import { db } from '@/lib/db';

interface User {
  id: string;
  type: 'customer' | 'agent';
  email: string;
  name: string;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await db.auth.getUser();
        if (user) {
          // First check if user is an agent
          const { data: agentData } = await db
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
          const { data: customerData } = await db
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
  }, []);

  return { user, loading };
} 