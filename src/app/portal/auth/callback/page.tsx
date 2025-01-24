'use client';

import { redirect } from 'next/navigation'
import { authService, userService } from '@/lib/services'

export default async function AuthCallback() {
  try {
    const { data: { user }, error: userError } = await authService.getUser({})
    if (userError || !user) {
      return redirect('/auth/sign-in')
    }

    // Check if user exists and get their type
    const userDetails = await userService.getCurrentUser({})
    if (!userDetails) {
      // New user - redirect to welcome page
      return redirect('/welcome')
    }

    // Redirect based on user type
    if (userDetails.type === 'customer') {
      return redirect('/portal')
    } else if (userDetails.type === 'agent') {
      return redirect('/tickets/overview')
    }

    // Fallback redirect if something unexpected happens
    return redirect('/welcome')
  } catch (error) {
    console.error('Auth callback error:', error)
    return redirect('/auth/sign-in')
  }
} 