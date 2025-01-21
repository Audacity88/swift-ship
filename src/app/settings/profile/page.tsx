'use client'

import { useState } from 'react'
import { User } from 'lucide-react'
import Image from 'next/image'
import { useAuth } from '@/lib/hooks/useAuth'
import { USER_ROLE_LABELS } from '@/types/role'
import { COLORS } from '@/lib/constants'

export default function SettingsProfilePage() {
  const { user } = useAuth()
  
  if (!user) {
    return null
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="space-y-6">
          <div className="flex items-center gap-6 pb-6 border-b border-gray-200">
            <div className="relative w-24 h-24">
              <Image
                src={user.avatar || "/images/default-avatar.png"}
                alt={user.name || "Profile"}
                fill
                className="rounded-full object-cover"
                priority
                unoptimized
              />
              <button 
                className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full text-sm"
                style={{ backgroundColor: COLORS.primary }}
              >
                <User className="w-4 h-4" />
              </button>
            </div>
            <div>
              <h3 className="font-medium">Profile Photo</h3>
              <p className="text-sm text-gray-500 mb-4">
                This will be displayed on your profile
              </p>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium">
                  Change Photo
                </button>
                <button className="px-4 py-2 text-red-600 bg-white border border-gray-200 rounded-lg text-sm font-medium">
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
                  defaultValue={user.name?.split(' ')[0]}
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
                  defaultValue={user.name?.split(' ')[1]}
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
                defaultValue={user.email}
                disabled
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
                defaultValue={user.phone}
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
                defaultValue={user.company}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-200 rounded-lg"
                value={USER_ROLE_LABELS[user.role]}
                disabled
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
              style={{ backgroundColor: COLORS.primary }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 