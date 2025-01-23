'use client';

import { redirect } from 'next/navigation'
import { authService, userService } from '@/lib/services'

export default async function AuthCallback() {
  try {
    const session = await authService.getSession({})
    if (!session) {
      return redirect('/auth/sign-in')
    }

    // Check if user exists and get their type
    const user = await userService.getCurrentUser({})
    if (!user) {
      // New user - redirect to welcome page
      return redirect('/welcome')
    }

    // Redirect based on user type
    if (user.type === 'customer') {
      return redirect('/portal')
    } else if (user.type === 'agent') {
      return redirect('/tickets/overview')
    }

    // Fallback redirect if something unexpected happens
    return redirect('/welcome')
  } catch (error) {
    console.error('Auth callback error:', error)
    return redirect('/auth/sign-in')
  }
} 