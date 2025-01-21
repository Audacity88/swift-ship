'use client';

import { useState } from 'react';
import { CustomerProfile as CustomerProfileType, PortalPreferences } from '@/types/portal';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { cn } from '@/lib/utils';

const profileFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  timezone: z.string(),
  language: z.string(),
});

const preferencesFormSchema = z.object({
  emailNotifications: z.object({
    ticketUpdates: z.boolean(),
    articleUpdates: z.boolean(),
    newsletter: z.boolean(),
  }),
  displayPreferences: z.object({
    theme: z.enum(['light', 'dark', 'system']),
    language: z.string(),
    articlesPerPage: z.number().min(5).max(50),
  }),
  categorySubscriptions: z.array(z.string()),
});

interface CustomerProfileProps {
  profile: CustomerProfileType;
  preferences: PortalPreferences;
  availableLanguages: { value: string; label: string }[];
  availableTimezones: { value: string; label: string }[];
  onUpdateProfile: (updates: Partial<CustomerProfileType>) => Promise<void>;
  onUpdatePreferences: (updates: Partial<PortalPreferences>) => Promise<void>;
  className?: string;
}

export const CustomerProfile = ({
  profile,
  preferences,
  availableLanguages,
  availableTimezones,
  onUpdateProfile,
  onUpdatePreferences,
  className,
}: CustomerProfileProps) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const profileForm = useForm({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: profile.name,
      email: profile.email,
      company: profile.company || '',
      jobTitle: profile.jobTitle || '',
      timezone: profile.timezone,
      language: profile.language,
    },
  });

  const preferencesForm = useForm({
    resolver: zodResolver(preferencesFormSchema),
    defaultValues: {
      emailNotifications: preferences.emailNotifications,
      displayPreferences: preferences.displayPreferences,
      categorySubscriptions: preferences.categorySubscriptions,
    },
  });

  const onProfileSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    setIsUpdating(true);
    try {
      await onUpdateProfile(values);
    } finally {
      setIsUpdating(false);
    }
  };

  const onPreferencesSubmit = async (values: z.infer<typeof preferencesFormSchema>) => {
    setIsUpdating(true);
    try {
      await onUpdatePreferences(values);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your personal information and account settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <FormField
                control={profileForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
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
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 md:grid-cols-2">
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
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={profileForm.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timezone</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableTimezones.map(({ value, label }) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Language</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableLanguages.map(({ value, label }) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" disabled={isUpdating}>
                Save Profile
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>
            Customize your notification settings and display preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...preferencesForm}>
            <form onSubmit={preferencesForm.handleSubmit(onPreferencesSubmit)} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Email Notifications</h3>
                <div className="space-y-4">
                  <FormField
                    control={preferencesForm.control}
                    name="emailNotifications.ticketUpdates"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Ticket Updates</FormLabel>
                          <FormDescription>
                            Receive notifications when your tickets are updated.
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
                    name="emailNotifications.articleUpdates"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Article Updates</FormLabel>
                          <FormDescription>
                            Get notified when articles you follow are updated.
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
                    name="emailNotifications.newsletter"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Newsletter</FormLabel>
                          <FormDescription>
                            Receive our monthly newsletter with updates and tips.
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
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Display Preferences</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={preferencesForm.control}
                    name="displayPreferences.theme"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Theme</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select theme" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="system">System</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={preferencesForm.control}
                    name="displayPreferences.articlesPerPage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Articles Per Page</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={5}
                            max={50}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Button type="submit" disabled={isUpdating}>
                Save Preferences
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}; 