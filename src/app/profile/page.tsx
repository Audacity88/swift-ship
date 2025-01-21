'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { USER_ROLE_LABELS } from '@/types/role'

export default function ProfilePage() {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  
  if (!user) {
    return null
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-8">Profile Settings</h1>
      
      <div className="grid gap-8 md:grid-cols-3">
        {/* Profile Overview */}
        <Card className="p-6 col-span-2">
          <div className="flex items-start gap-6">
            <Avatar className="w-20 h-20">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-semibold text-primary">
                  {user.name?.charAt(0).toUpperCase()}
                </span>
              </div>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{user.name}</h2>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? 'Cancel' : 'Edit Profile'}
                </Button>
              </div>
              
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <Input
                      defaultValue={user.name}
                      className="max-w-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <Input
                      defaultValue={user.email}
                      type="email"
                      className="max-w-md"
                      disabled
                    />
                  </div>
                  <Button type="submit">
                    Save Changes
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-600">{user.email}</p>
                  <p className="text-sm text-gray-500">
                    Role: {USER_ROLE_LABELS[user.role]}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
        
        {/* Quick Stats */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Account Overview</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Member Since</p>
              <p className="font-medium">
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Login</p>
              <p className="font-medium">
                {new Date(user.lastSignInAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
} 