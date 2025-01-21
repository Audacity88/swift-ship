'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { db } from '@/lib/db';

interface ResetFormData {
  email: string;
  password?: string;
  confirmPassword?: string;
}

export function PasswordReset() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<ResetFormData>({ email: '' });

  // Check if we're in reset mode (have token) or request mode
  const token = searchParams?.get('token');
  const isResetMode = !!token;

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await db.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/portal/auth/reset-password`,
      });

      if (error) throw error;

      setSuccess('Password reset instructions have been sent to your email');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset instructions');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await db.auth.updateUser({
        password: formData.password,
      });

      if (error) throw error;

      setSuccess('Password has been reset successfully');
      setTimeout(() => {
        router.push('/portal/auth/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6 p-6 bg-white rounded-lg shadow-lg">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">
          {isResetMode ? 'Reset Your Password' : 'Forgot Password'}
        </h1>
        <p className="text-gray-500">
          {isResetMode
            ? 'Enter your new password below'
            : 'Enter your email to receive reset instructions'}
        </p>
      </div>

      <form
        onSubmit={isResetMode ? handleResetPassword : handleRequestReset}
        className="space-y-4"
      >
        {!isResetMode && (
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
        )}

        {isResetMode && (
          <>
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password || ''}
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
                value={formData.confirmPassword || ''}
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
              {isResetMode ? 'Resetting password...' : 'Sending instructions...'}
            </>
          ) : (
            isResetMode ? 'Reset Password' : 'Send Reset Instructions'
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => router.push('/portal/auth/login')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Login
        </Button>
      </form>
    </div>
  );
} 