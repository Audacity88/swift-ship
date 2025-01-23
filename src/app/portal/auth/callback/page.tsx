'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/app/providers';
import { RoleType } from '@/types/role';
import { Icons } from '@/components/ui/icons';

export default function AuthCallback() {
  const router = useRouter();
  const supabase = useSupabase();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!session) throw new Error('No session');

        // Check if user exists in customers table
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('id', session.user.id)
          .single();

        if (customer) {
          router.push('/portal/dashboard');
        } else {
          // Check if user exists in agents table
          const { data: agent } = await supabase
            .from('agents')
            .select('id')
            .eq('id', session.user.id)
            .single();

          if (agent) {
            router.push('/dashboard');
          } else {
            // New user - redirect to welcome page
            router.push('/portal/welcome');
          }
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        router.push('/auth/error');
      }
    };

    handleCallback();
  }, [router, supabase]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Icons.spinner className="mx-auto h-8 w-8 animate-spin" />
        <p className="mt-4 text-sm text-muted-foreground">
          Completing authentication...
        </p>
      </div>
    </div>
  );
} 