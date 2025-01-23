import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase-client'
import type { CustomFieldDefinition } from '@/types/custom-field'

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
    const supabase = getServerSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: fields, error } = await supabase
      .from('custom_fields')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching custom fields:', error)
      return NextResponse.json(
        { error: 'Failed to fetch custom fields' },
        { status: 500 }
      )
    }

    return NextResponse.json(fields)
  } catch (error) {
    console.error('Error in GET /api/custom-fields:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getServerSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

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
        is_active: true,
        created_by: user.id
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
    const supabase = getServerSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const field: CustomFieldDefinition = await request.json()

    if (!field.id) {
      return NextResponse.json(
        { error: 'Field ID is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('custom_field_definitions')
      .update({
        ...field,
        updated_at: new Date().toISOString()
      })
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
    const supabase = getServerSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

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
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
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