'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { authService } from '@/lib/services';

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
        await authService.resetPassword({}, formData.password);
        setSuccess('Password has been reset successfully');
        setTimeout(() => {
          router.push('/auth/signin');
        }, 2000);
      } else {
        // Send reset email
        await authService.resetPassword({}, formData.email);
        setSuccess('Password reset instructions have been sent to your email');
      }
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  return React.createElement(React.Fragment, null,
    React.createElement('div', { className: 'space-y-6' },
      React.createElement('div', { className: 'space-y-2' },
        React.createElement(Button, {
          variant: 'ghost',
          className: 'mb-4',
          onClick: () => router.push('/auth/signin')
        },
          React.createElement(ArrowLeft, { className: 'mr-2 h-4 w-4' }),
          'Back to Sign In'
        ),
        React.createElement('h1', { className: 'text-2xl font-semibold tracking-tight' },
          isResetMode ? 'Reset Your Password' : 'Forgot Password'
        ),
        React.createElement('p', { className: 'text-sm text-muted-foreground' },
          isResetMode
            ? 'Enter your new password below'
            : 'Enter your email and we will send you reset instructions'
        )
      ),
      React.createElement('form', { onSubmit: handleSubmit, className: 'space-y-4' },
        !isResetMode && React.createElement('div', { className: 'space-y-2' },
          React.createElement(Label, { htmlFor: 'email' }, 'Email'),
          React.createElement(Input, {
            id: 'email',
            type: 'email',
            value: formData.email,
            onChange: (e) => setFormData({ ...formData, email: e.target.value }),
            required: true
          })
        ),
        isResetMode && React.createElement(React.Fragment, null,
          React.createElement('div', { className: 'space-y-2' },
            React.createElement(Label, { htmlFor: 'password' }, 'New Password'),
            React.createElement(Input, {
              id: 'password',
              type: 'password',
              value: formData.password,
              onChange: (e) => setFormData({ ...formData, password: e.target.value }),
              required: true
            })
          ),
          React.createElement('div', { className: 'space-y-2' },
            React.createElement(Label, { htmlFor: 'confirmPassword' }, 'Confirm Password'),
            React.createElement(Input, {
              id: 'confirmPassword',
              type: 'password',
              value: formData.confirmPassword,
              onChange: (e) => setFormData({ ...formData, confirmPassword: e.target.value }),
              required: true
            })
          )
        ),
        error && React.createElement(Alert, { variant: 'destructive' },
          React.createElement(AlertDescription, null, error)
        ),
        success && React.createElement(Alert, null,
          React.createElement(AlertDescription, null, success)
        ),
        React.createElement(Button, {
          type: 'submit',
          className: 'w-full',
          disabled: loading
        },
          loading ? React.createElement(React.Fragment, null,
            React.createElement(Loader2, { className: 'mr-2 h-4 w-4 animate-spin' }),
            isResetMode ? 'Resetting Password...' : 'Sending Instructions...'
          ) : (
            isResetMode ? 'Reset Password' : 'Send Instructions'
          )
        )
      )
    )
  );
} 