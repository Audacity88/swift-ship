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
          // Get additional user data from your database
          const { data: userData } = await db
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

          setUser({
            id: user.id,
            type: userData.role,
            email: user.email!,
            name: userData.name,
          });
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