'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { Card } from '@/components/ui/card';
import { db } from '@/lib/db';

interface User {
  name: string;
  email: string;
}

export default function WelcomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user: authUser }, error } = await db.auth.getUser();
        if (error || !authUser) {
          router.push('/portal/auth/login');
          return;
        }

        const { data: profile } = await db
          .from('customer_profiles')
          .select('*')
          .eq('user_id', authUser.id)
          .single();

        setUser({
          name: profile?.name || authUser.email?.split('@')[0] || 'there',
          email: authUser.email || '',
        });
      } catch (err) {
        console.error('Error fetching user:', err);
        router.push('/portal/auth/login');
      }
    };

    fetchUser();
  }, [router]);

  const features = [
    {
      title: 'Knowledge Base',
      description: 'Access our comprehensive documentation and guides',
      icon: <Icons.book className="h-6 w-6" />,
      href: '/portal/knowledge',
    },
    {
      title: 'Support Tickets',
      description: 'Create and track your support requests',
      icon: <Icons.ticket className="h-6 w-6" />,
      href: '/portal/tickets',
    },
    {
      title: 'Profile Settings',
      description: 'Customize your account preferences',
      icon: <Icons.user className="h-6 w-6" />,
      href: '/portal/profile',
    },
  ];

  if (!user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome, {user.name}! 👋
          </h1>
          <p className="text-lg text-gray-500">
            We're excited to have you here. Let's get you started with our customer
            portal.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="relative overflow-hidden p-6 hover:shadow-lg transition-shadow"
            >
              <div className="space-y-2">
                <div className="text-primary">{feature.icon}</div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="text-sm text-gray-500">{feature.description}</p>
              </div>
              <Button
                variant="ghost"
                className="absolute bottom-4 right-4"
                onClick={() => router.push(feature.href)}
              >
                Explore
                <Icons.arrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>

        <div className="rounded-lg bg-gray-50 p-6 space-y-4">
          <h2 className="text-2xl font-semibold">Next Steps</h2>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="rounded-full bg-primary/10 p-1">
                <Icons.check className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">Complete your profile</p>
                <p className="text-sm text-gray-500">
                  Add your company details and preferences
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="rounded-full bg-primary/10 p-1">
                <Icons.check className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">Browse the knowledge base</p>
                <p className="text-sm text-gray-500">
                  Find answers to common questions
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="rounded-full bg-primary/10 p-1">
                <Icons.check className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">Create your first ticket</p>
                <p className="text-sm text-gray-500">
                  Get help from our support team
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={() => router.push('/portal')}
            className="px-8"
          >
            Go to Portal Home
            <Icons.arrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
} 