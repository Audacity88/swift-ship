import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureUserProfile, PROFILE_MISSING_MESSAGE } from '@/lib/auth/profile'
import { z } from 'zod'

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  phone: z.string().max(100).optional(),
  company: z.string().max(200).optional(),
  jobTitle: z.string().max(200).optional(),
  preferences: z.object({
    emailNotifications: z.boolean(), articleUpdates: z.boolean(), ticketUpdates: z.boolean(),
    newsletter: z.boolean(), language: z.string().max(30), timezone: z.string().max(100),
  }).optional(),
}).strict()

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const profile = await ensureUserProfile(supabase, user)
    return NextResponse.json(profile)
  } catch {
    return NextResponse.json({ error: PROFILE_MISSING_MESSAGE }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const parsed = updateProfileSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Check the profile fields and try again.' }, { status: 400 })
    const { jobTitle, ...updates } = parsed.data
    const { data: customer, error: updateError } = await supabase.from('customers')
      .update({ ...updates, ...(jobTitle !== undefined ? { job_title: jobTitle } : {}), updated_at: new Date().toISOString() })
      .eq('id', user.id).select('*').maybeSingle()
    if (updateError) return NextResponse.json({ error: 'Unable to save your profile. Please try again.' }, { status: 500 })
    if (!customer) return NextResponse.json({ error: PROFILE_MISSING_MESSAGE }, { status: 404 })
    return NextResponse.json(customer)
  } catch {
    return NextResponse.json({ error: 'Unable to save your profile. Please try again.' }, { status: 500 })
  }
}
