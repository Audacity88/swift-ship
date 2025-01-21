'use client';

import { PasswordReset } from '@/components/features/auth/PasswordReset';
import { Suspense } from 'react';

export default function ResetPasswordPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <Suspense fallback={
          <div className="w-full max-w-md space-y-6 p-6 bg-white rounded-lg shadow-lg">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-bold">Loading...</h1>
            </div>
          </div>
        }>
          <PasswordReset />
        </Suspense>
      </div>
    </div>
  );
} 