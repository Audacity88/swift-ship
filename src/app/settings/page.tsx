'use client'

import { useState } from 'react'
import { 
  User, Bell, Shield, CreditCard, Globe, Mail, 
  Smartphone, Moon, Sun, ChevronRight
} from 'lucide-react'
import Image from 'next/image'
import { COLORS } from '@/lib/constants'

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
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')
  const [notifications, setNotifications] = useState(notificationSettings)
  const [darkMode, setDarkMode] = useState(false)
  const [emailUpdates, setEmailUpdates] = useState(true)

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

  return (
    <div className="flex h-[calc(100vh-5rem)] -mt-6 -mx-6">
      {/* Navigation Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        </div>
        <nav className="px-3">
          {navigationItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as SettingsSection)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm \
                  transition-colors mb-1 \
                  ${activeSection === item.id 
                    ? 'bg-primary text-white' 
                    : 'text-gray-600 hover:bg-gray-50'
                  }`}
                style={activeSection === item.id ? { backgroundColor: COLORS.primary } : {}}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-white overflow-auto">
        <div className="max-w-3xl mx-auto p-6">
          {/* Profile Section */}
          {activeSection === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Profile Information</h2>
              
              <div className="flex items-center gap-6 pb-6 border-b border-gray-200">
                <div className="relative w-24 h-24">
                  <Image
                    src="https://picsum.photos/200"
                    alt="Profile"
                    fill
                    className="rounded-full object-cover"
                  />
                  <button className="absolute bottom-0 right-0 p-1.5 bg-primary text-white \
                    rounded-full text-sm"
                    style={{ backgroundColor: COLORS.primary }}>
                    <User className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <h3 className="font-medium">Profile Photo</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    This will be displayed on your profile
                  </p>
                  <div className="flex gap-3">
                    <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg \
                      text-sm font-medium">
                      Change Photo
                    </button>
                    <button className="px-4 py-2 text-red-600 bg-white border border-gray-200 \
                      rounded-lg text-sm font-medium">
                      Remove
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-200 rounded-lg"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-200 rounded-lg"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="w-full p-2 border border-gray-200 rounded-lg"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    className="w-full p-2 border border-gray-200 rounded-lg"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-200 rounded-lg"
                    placeholder="Company Name"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={async () => {
                    try {
                      // Example: send to /api/users or /api/preferences
                      await fetch('/api/preferences', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ darkMode, emailUpdates }),
                      })
                      alert('Preferences saved!')
                    } catch (err) {
                      console.error('Failed to save settings:', err)
                    }
                  }}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
                  style={{ backgroundColor: COLORS.primary }}
                >
                  Save Changes
                </button>
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
                    className="flex items-start justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium">{notification.title}</h3>
                      <p className="text-sm text-gray-500">{notification.description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleNotificationChange(
                          notification.id,
                          'email',
                          !notification.email
                        )}
                        className={`p-2 rounded-lg ${
                          notification.email 
                            ? 'bg-primary text-white' 
                            : 'bg-white border border-gray-200'
                        }`}
                        style={notification.email ? { backgroundColor: COLORS.primary } : {}}
                      >
                        <Mail className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleNotificationChange(
                          notification.id,
                          'push',
                          !notification.push
                        )}
                        className={`p-2 rounded-lg ${
                          notification.push 
                            ? 'bg-primary text-white' 
                            : 'bg-white border border-gray-200'
                        }`}
                        style={notification.push ? { backgroundColor: COLORS.primary } : {}}
                      >
                        <Bell className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleNotificationChange(
                          notification.id,
                          'sms',
                          !notification.sms
                        )}
                        className={`p-2 rounded-lg ${
                          notification.sms 
                            ? 'bg-primary text-white' 
                            : 'bg-white border border-gray-200'
                        }`}
                        style={notification.sms ? { backgroundColor: COLORS.primary } : {}}
                      >
                        <Smartphone className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security Section */}
          {activeSection === 'security' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Security Settings</h2>
              
              <div className="space-y-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-1">Change Password</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Ensure your account is using a strong password
                  </p>
                  <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg \
                    text-sm font-medium">
                    Update Password
                  </button>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-1">Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Add an extra layer of security to your account
                  </p>
                  <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg \
                    text-sm font-medium">
                    Enable 2FA
                  </button>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-1">Active Sessions</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Manage your active sessions across devices
                  </p>
                  <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg \
                    text-sm font-medium text-red-600">
                    Sign Out All Devices
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Billing Section */}
          {activeSection === 'billing' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Billing & Plans</h2>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium">Current Plan</h3>
                    <p className="text-sm text-gray-500">Professional Plan</p>
                  </div>
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm \
                    font-medium"
                    style={{ color: COLORS.primary }}>
                    Active
                  </span>
                </div>
                <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg \
                  text-sm font-medium">
                  Upgrade Plan
                </button>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-4">Payment Method</h3>
                <div className="flex items-center justify-between p-3 bg-white rounded-lg \
                  border border-gray-200 mb-4">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    <span>•••• •••• •••• 4242</span>
                  </div>
                  <span className="text-sm text-gray-500">Expires 12/24</span>
                </div>
                <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg \
                  text-sm font-medium">
                  Update Payment Method
                </button>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-4">Billing History</h3>
                <div className="space-y-2">
                  {[
                    { date: '2024-01-19', amount: '$49.99', status: 'Paid' },
                    { date: '2023-12-19', amount: '$49.99', status: 'Paid' },
                    { date: '2023-11-19', amount: '$49.99', status: 'Paid' },
                  ].map((invoice, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-white rounded-lg \
                        border border-gray-200"
                    >
                      <div>
                        <p className="font-medium">{invoice.amount}</p>
                        <p className="text-sm text-gray-500">{invoice.date}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-green-600 font-medium">
                          {invoice.status}
                        </span>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Preferences Section */}
          {activeSection === 'preferences' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">System Preferences</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium">Dark Mode</h3>
                    <p className="text-sm text-gray-500">
                      Toggle between light and dark theme
                    </p>
                  </div>
                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className={`p-2 rounded-lg ${
                      darkMode ? 'bg-primary text-white' : 'bg-white border border-gray-200'
                    }`}
                    style={darkMode ? { backgroundColor: COLORS.primary } : {}}
                  >
                    {darkMode ? (
                      <Moon className="w-5 h-5" />
                    ) : (
                      <Sun className="w-5 h-5" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium">Email Updates</h3>
                    <p className="text-sm text-gray-500">
                      Receive our newsletter and updates
                    </p>
                  </div>
                  <button
                    onClick={() => setEmailUpdates(!emailUpdates)}
                    className={`p-2 rounded-lg ${
                      emailUpdates ? 'bg-primary text-white' : 'bg-white border border-gray-200'
                    }`}
                    style={emailUpdates ? { backgroundColor: COLORS.primary } : {}}
                  >
                    <Mail className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium">Language</h3>
                    <p className="text-sm text-gray-500">
                      Choose your preferred language
                    </p>
                  </div>
                  <select className="p-2 bg-white border border-gray-200 rounded-lg text-sm">
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium">Time Zone</h3>
                    <p className="text-sm text-gray-500">
                      Set your local time zone
                    </p>
                  </div>
                  <select className="p-2 bg-white border border-gray-200 rounded-lg text-sm">
                    <option value="utc">UTC</option>
                    <option value="est">EST</option>
                    <option value="pst">PST</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 