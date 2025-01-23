'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSupabase } from '@/app/providers';

interface ResetFormData {
  email: string;
  password?: string;
  confirmPassword?: string;
}

export function PasswordReset() {
  const [formData, setFormData] = useState<ResetFormData>({ email: '' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useSupabase();

  // Check if we're in reset mode (have a token)
  const token = searchParams.get('token');
  const isResetMode = !!token;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isResetMode) {
        // Validate passwords match
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }

        if (!formData.password) {
          throw new Error('Password is required');
        }

        // Update password
        const { error } = await supabase.auth.updateUser({
          password: formData.password
        });

        if (error) throw error;

        setSuccess('Password has been reset successfully');
        setTimeout(() => {
          router.push('/auth/signin');
        }, 2000);
      } else {
        // Send reset email
        const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
          redirectTo: `${window.location.origin}/auth/reset-password`
        });

        if (error) throw error;

        setSuccess('Password reset instructions have been sent to your email');
      }
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => router.push('/auth/signin')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Sign In
        </Button>

        <h1 className="text-2xl font-semibold tracking-tight">
          {isResetMode ? 'Reset Your Password' : 'Forgot Password'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isResetMode
            ? 'Enter your new password below'
            : 'Enter your email and we'll send you reset instructions'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isResetMode && (
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
        )}

        {isResetMode && (
          <>
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                required
              />
            </div>
          </>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isResetMode ? 'Resetting Password...' : 'Sending Instructions...'}
            </>
          ) : (
            isResetMode ? 'Reset Password' : 'Send Instructions'
          )}
        </Button>
      </form>
    </div>
  );
} 