import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/auth/server'

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireStaff(true)
    if (auth.response) return auth.response
    const email = new URL(request.url).searchParams.get('email')?.trim().toLowerCase()
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    let target
    for (let page = 1; ; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 })
      if (error) return NextResponse.json({ error: 'Unable to find the auth account' }, { status: 500 })
      target = data.users.find(user => user.email?.toLowerCase() === email)
      if (target || data.users.length < 100) break
    }
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (target.id === auth.user.id) return NextResponse.json({ error: 'You cannot delete your own admin account' }, { status: 400 })
    const { error } = await admin.auth.admin.deleteUser(target.id)
    if (error) return NextResponse.json({ error: 'Unable to delete the auth account. Reassign its work first.' }, { status: 409 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unable to delete the auth account' }, { status: 500 })
  }
}
