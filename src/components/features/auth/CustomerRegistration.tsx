'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/ui/icons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { db } from '@/lib/db';
import { UserRole } from '@/types/role';
import type { AuthError } from '@supabase/supabase-js';

interface RegistrationData {
  email: string;
  password: string;
  name: string;
  company?: string;
}

interface CustomerProfile {
  user_id: string;
  name: string;
  company: string | null;
  created_at: string;
}

interface UserRoleData {
  user_id: string;
  role: UserRole;
  assigned_by: string;
  assigned_at: string;
}

export function CustomerRegistration() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<RegistrationData>({
    email: '',
    password: '',
    name: '',
    company: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Create auth user
      const { data: authData, error: authError } = await db.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: UserRole.CUSTOMER,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create customer profile
        const customerProfile: CustomerProfile = {
          user_id: authData.user.id,
          name: formData.name,
          company: formData.company || null,
          created_at: new Date().toISOString(),
        };

        const { error: profileError } = await db
          .from('customer_profiles')
          .insert(customerProfile);

        if (profileError) throw profileError;

        // Set default role and permissions
        const userRole: UserRoleData = {
          user_id: authData.user.id,
          role: UserRole.CUSTOMER,
          assigned_by: 'SYSTEM',
          assigned_at: new Date().toISOString(),
        };

        const { error: roleError } = await db
          .from('user_roles')
          .insert(userRole);

        if (roleError) throw roleError;

        router.push('/portal/welcome');
      }
    } catch (err) {
      const error = err as AuthError;
      setError(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    try {
      const { error } = await db.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/portal/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err) {
      const error = err as AuthError;
      setError(error.message || `Failed to sign in with ${provider}`);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6 p-6 bg-white rounded-lg shadow-lg">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Create Your Account</h1>
        <p className="text-gray-500">Get started with our customer portal</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            onClick={() => handleSocialLogin('google')}
            disabled={loading}
            className="w-full"
          >
            <Icons.google className="mr-2 h-4 w-4" />
            Google
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSocialLogin('github')}
            disabled={loading}
            className="w-full"
          >
            <Icons.gitHub className="mr-2 h-4 w-4" />
            GitHub
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">Or continue with</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@company.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company (Optional)</Label>
            <Input
              id="company"
              placeholder="Company Name"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
} 