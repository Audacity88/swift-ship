'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const profileFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
});

const preferencesFormSchema = z.object({
  emailNotifications: z.boolean(),
  articleUpdates: z.boolean(),
  ticketUpdates: z.boolean(),
  newsletter: z.boolean(),
  language: z.string(),
  timezone: z.string(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PreferencesFormValues = z.infer<typeof preferencesFormSchema>;

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
      email: '',
      company: '',
      jobTitle: '',
    },
  });

  const preferencesForm = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesFormSchema),
    defaultValues: {
      emailNotifications: true,
      articleUpdates: true,
      ticketUpdates: true,
      newsletter: false,
      language: 'en',
      timezone: 'UTC',
    },
  });

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      try {
        const response = await fetch('/api/portal/profile');
        const profile = await response.json();
        if (!response.ok) throw new Error(profile.error || 'Unable to load your profile.');
        if (!mounted) return;
        profileForm.reset({ name: profile.name, email: profile.email, company: profile.company || '', jobTitle: profile.job_title || '' });
        if (profile.preferences) preferencesForm.reset({ ...preferencesForm.getValues(), ...profile.preferences });
      } catch (error) {
        if (mounted) { setLoadFailed(true); setFeedback(error instanceof Error ? error.message : 'Unable to load your profile.'); }
      } finally { if (mounted) setIsFetching(false); }
    };
    void loadProfile();
    return () => { mounted = false; };
  }, [profileForm, preferencesForm]);

  const saveProfile = async (updates: object) => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/portal/profile', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save your profile.');
      setFeedback('Your changes have been saved.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to save your profile.');
    } finally { setIsLoading(false); }
  };

  const onSubmitProfile = async (values: ProfileFormValues) => saveProfile({ name: values.name, company: values.company, jobTitle: values.jobTitle });
  const onSubmitPreferences = async (values: PreferencesFormValues) => saveProfile({ preferences: values });

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {isFetching && <p role="status">Loading your profile...</p>}
      {feedback && <p role="status" className="rounded border p-3">{feedback}</p>}
      <div>
        <Link href="/home" className="inline-flex items-center text-muted-foreground hover:text-foreground">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
      </div>

      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Separator />

      <Tabs defaultValue="profile" className="space-y-8">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and contact details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" readOnly aria-readonly="true" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="jobTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="submit" disabled={isLoading || isFetching || loadFailed}>
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how and when you want to be notified
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...preferencesForm}>
                <form onSubmit={preferencesForm.handleSubmit(onSubmitPreferences)} className="space-y-6">
                  <div className="space-y-4">
                    <FormField
                      control={preferencesForm.control}
                      name="emailNotifications"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel>Email Notifications</FormLabel>
                            <FormDescription>
                              Receive notifications via email
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={preferencesForm.control}
                      name="articleUpdates"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel>Article Updates</FormLabel>
                            <FormDescription>
                              Get notified about updates to articles you follow
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={preferencesForm.control}
                      name="ticketUpdates"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel>Ticket Updates</FormLabel>
                            <FormDescription>
                              Receive notifications about your support tickets
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={preferencesForm.control}
                      name="newsletter"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel>Newsletter</FormLabel>
                            <FormDescription>
                              Subscribe to our monthly newsletter
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="submit" disabled={isLoading || isFetching || loadFailed}>
                    {isLoading ? 'Saving...' : 'Save Preferences'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 