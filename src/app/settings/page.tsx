'use client'

import { useState } from 'react'
import { 
  User, Bell, Shield, CreditCard, Globe, Mail, 
  Smartphone, Moon, Sun, ChevronRight
} from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useTheme } from '@/lib/hooks/useTheme'
import { useAuth } from '@/lib/hooks/useAuth'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { USER_ROLE_LABELS } from '@/types/role'

type SettingsSection = 'profile' | 'notifications' | 'security' | 'billing' | 'preferences'

interface NotificationSetting {
  id: string
  title: string
  description: string
  email: boolean
  push: boolean
  sms: boolean
}

const notificationSettings: NotificationSetting[] = [
  {
    id: 'shipment_updates',
    title: 'Shipment Updates',
    description: 'Get notified about status changes and delivery updates',
    email: true,
    push: true,
    sms: false,
  },
  {
    id: 'pickup_reminders',
    title: 'Pickup Reminders',
    description: 'Receive reminders about scheduled pickups',
    email: true,
    push: true,
    sms: true,
  },
  {
    id: 'billing_alerts',
    title: 'Billing Alerts',
    description: 'Get notified about payments and invoices',
    email: true,
    push: false,
    sms: false,
  },
  {
    id: 'marketing',
    title: 'Marketing & Promotions',
    description: 'Stay updated with our latest offers and news',
    email: false,
    push: false,
    sms: false,
  },
]

const navigationItems = [
  { id: 'profile', label: 'Profile Information', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'billing', label: 'Billing & Plans', icon: CreditCard },
  { id: 'preferences', label: 'Preferences', icon: Globe },
]

export default function SettingsPage() {
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')
  const [notifications, setNotifications] = useState(notificationSettings)
  const [emailUpdates, setEmailUpdates] = useState(true)
  const { theme, setTheme } = useTheme()

  const handleNotificationChange = (
    id: string,
    type: 'email' | 'push' | 'sms',
    value: boolean
  ) => {
    setNotifications(prev =>
      prev.map(item =>
        item.id === id ? { ...item, [type]: value } : item
      )
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className={cn(
      "flex h-[calc(100vh-5rem)] -mt-6 -mx-6",
      "bg-background"
    )}>
      {/* Navigation Sidebar */}
      <div className={cn(
        "w-64",
        "border-r border-border",
        "bg-card"
      )}>
        <div className="p-6">
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>
        <nav className="px-3">
          {navigationItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as SettingsSection)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm",
                  "transition-colors mb-1",
                  activeSection === item.id 
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content Area */}
      <div className={cn(
        "flex-1 overflow-auto",
        "bg-background"
      )}>
        <div className="max-w-3xl mx-auto p-6">
          {/* Profile Section */}
          {activeSection === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Profile Information</h2>
              
              <div className={cn(
                "flex items-center gap-6 pb-6",
                "border-b border-border"
              )}>
                <div className="relative w-24 h-24">
                  <Image
                    src={user.avatar || "/images/default-avatar.png"}
                    alt={user.name || "Profile"}
                    fill
                    className="rounded-full object-cover"
                    priority
                    unoptimized
                  />
                </div>
                <div>
                  <h3 className="font-medium">Profile Photo</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    This will be displayed on your profile
                  </p>
                  <div className="flex gap-3">
                    <Button variant="outline">
                      Change Photo
                    </Button>
                    <Button variant="outline" className="text-destructive">
                      Remove
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      defaultValue={user.name?.split(' ')[0]}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      defaultValue={user.name?.split(' ')[1]}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    defaultValue={user.email}
                    disabled
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    defaultValue={user.phone}
                  />
                </div>

                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    type="text"
                    placeholder="Company Name"
                    defaultValue={user.company}
                  />
                </div>

                <div>
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    type="text"
                    value={USER_ROLE_LABELS[user.role]}
                    disabled
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={async () => {
                    try {
                      await fetch('/api/preferences', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ theme, emailUpdates }),
                      })
                      alert('Preferences saved!')
                    } catch (err) {
                      console.error('Failed to save settings:', err)
                    }
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}

          {/* Notifications Section */}
          {activeSection === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Notification Preferences</h2>
              
              <div className="space-y-6">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start justify-between p-4 rounded-lg",
                      "bg-muted"
                    )}
                  >
                    <div>
                      <h3 className="font-medium">{notification.title}</h3>
                      <p className="text-sm text-muted-foreground">{notification.description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center gap-1">
                        <Switch
                          checked={notification.email}
                          onCheckedChange={(checked) => 
                            handleNotificationChange(notification.id, 'email', checked)
                          }
                        />
                        <span className="text-xs text-muted-foreground">Email</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <Switch
                          checked={notification.push}
                          onCheckedChange={(checked) => 
                            handleNotificationChange(notification.id, 'push', checked)
                          }
                        />
                        <span className="text-xs text-muted-foreground">Push</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <Switch
                          checked={notification.sms}
                          onCheckedChange={(checked) => 
                            handleNotificationChange(notification.id, 'sms', checked)
                          }
                        />
                        <span className="text-xs text-muted-foreground">SMS</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preferences Section */}
          {activeSection === 'preferences' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Preferences</h2>
              
              <div className="space-y-6">
                <div className={cn(
                  "flex items-center justify-between p-4 rounded-lg",
                  "bg-muted"
                )}>
                  <div>
                    <h3 className="font-medium">Dark Mode</h3>
                    <p className="text-sm text-muted-foreground">
                      Toggle between light and dark themes
                    </p>
                  </div>
                  <Switch
                    checked={theme === 'dark'}
                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                  />
                </div>

                <div className={cn(
                  "flex items-center justify-between p-4 rounded-lg",
                  "bg-muted"
                )}>
                  <div>
                    <h3 className="font-medium">Email Updates</h3>
                    <p className="text-sm text-muted-foreground">
                      Receive email updates about your account
                    </p>
                  </div>
                  <Switch
                    checked={emailUpdates}
                    onCheckedChange={setEmailUpdates}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 