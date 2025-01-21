import { CustomerRegistration } from '@/components/features/auth/CustomerRegistration';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Register | Customer Portal',
  description: 'Create your customer portal account to access support and resources.',
};

export default function RegisterPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <CustomerRegistration />
      </div>
    </div>
  );
} 