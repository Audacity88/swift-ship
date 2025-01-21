'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { UserRole } from '@/types/role';
import { Icons } from '@/components/ui/icons';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { user }, error } = await db.auth.getUser();
        
        if (error || !user) {
          throw error || new Error('No user found');
        }

        // Check if customer profile exists
        const { data: profile } = await db
          .from('customer_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (!profile) {
          // Create customer profile
          const { error: profileError } = await db.from('customer_profiles').insert({
            user_id: user.id,
            name: user.user_metadata.name || user.email?.split('@')[0],
            created_at: new Date().toISOString(),
          });

          if (profileError) throw profileError;

          // Set default role and permissions
          const { error: roleError } = await db.from('user_roles').insert({
            user_id: user.id,
            role: UserRole.CUSTOMER,
            assigned_by: 'SYSTEM',
            assigned_at: new Date().toISOString(),
          });

          if (roleError) throw roleError;
        }

        // Redirect to welcome page for new users, or portal home for existing users
        router.push(profile ? '/portal' : '/portal/welcome');
      } catch (err) {
        console.error('Auth callback error:', err);
        router.push('/portal/auth/login?error=callback_failed');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <Icons.spinner className="h-8 w-8 animate-spin" />
        <p className="text-lg text-gray-500">Setting up your account...</p>
      </div>
    </div>
  );
} 