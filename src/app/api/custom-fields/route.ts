import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { CustomFieldDefinition } from '@/types/custom-field'

const createClient = () => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookieStore = await cookies()
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

const mockCustomFields: CustomFieldDefinition[] = [
  {
    id: 'browser_version',
    name: 'Browser Version',
    type: 'text',
    description: 'The browser version where the issue occurred',
    required: true,
    is_system: false,
    is_archived: false,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_by_id: '1',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'impact_level',
    name: 'Impact Level',
    type: 'select',
    description: 'The impact level of the issue',
    required: true,
    options: [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' }
    ],
    is_system: false,
    is_archived: false,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_by_id: '1',
    displayOrder: 2,
    isActive: true,
  }
]

export async function GET() {
  try {
    return NextResponse.json({ data: mockCustomFields })
  } catch (error) {
    console.error('Failed to fetch custom fields:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const field: CustomFieldDefinition = await request.json()

    // Validate required fields
    if (!field.name || !field.type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      )
    }

    // Get max display order
    const { data: maxOrder } = await supabase
      .from('custom_field_definitions')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .single()

    const displayOrder = (maxOrder?.display_order || 0) + 1

    const { data, error } = await supabase
      .from('custom_field_definitions')
      .insert({
        ...field,
        display_order: displayOrder,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to create custom field:', error)
    return NextResponse.json(
      { error: 'Failed to create custom field' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const field: CustomFieldDefinition = await request.json()

    if (!field.id) {
      return NextResponse.json(
        { error: 'Field ID is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('custom_field_definitions')
      .update(field)
      .eq('id', field.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to update custom field:', error)
    return NextResponse.json(
      { error: 'Failed to update custom field' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Field ID is required' },
        { status: 400 }
      )
    }

    // Check if field is system-generated
    const { data: field } = await supabase
      .from('custom_field_definitions')
      .select('is_system')
      .eq('id', id)
      .single()

    if (field?.is_system) {
      return NextResponse.json(
        { error: 'Cannot delete system-generated fields' },
        { status: 400 }
      )
    }

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('custom_field_definitions')
      .update({ is_active: false })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete custom field:', error)
    return NextResponse.json(
      { error: 'Failed to delete custom field' },
      { status: 500 }
    )
  }
} 