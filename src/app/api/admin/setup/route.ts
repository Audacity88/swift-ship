import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase-client'

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

    // Get user role
    const { data: agent } = await supabase
      .from('agents')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = agent?.role === 'admin'

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const setupData = await request.json()

    // Create default roles
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .insert([
        {
          name: 'admin',
          description: 'Full system access',
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          name: 'agent',
          description: 'Support agent access',
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          name: 'customer',
          description: 'Customer access',
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()

    if (rolesError) {
      console.error('Error creating default roles:', rolesError)
      return NextResponse.json(
        { error: 'Failed to create default roles' },
        { status: 500 }
      )
    }

    // Create default permissions
    const { data: permissions, error: permissionsError } = await supabase
      .from('permissions')
      .insert([
        {
          name: 'view_tickets',
          description: 'View tickets',
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          name: 'create_tickets',
          description: 'Create tickets',
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          name: 'update_tickets',
          description: 'Update tickets',
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          name: 'delete_tickets',
          description: 'Delete tickets',
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()

    if (permissionsError) {
      console.error('Error creating default permissions:', permissionsError)
      return NextResponse.json(
        { error: 'Failed to create default permissions' },
        { status: 500 }
      )
    }

    // Assign permissions to roles
    const adminRole = roles.find(r => r.name === 'admin')
    const agentRole = roles.find(r => r.name === 'agent')
    const customerRole = roles.find(r => r.name === 'customer')

    if (!adminRole || !agentRole || !customerRole) {
      return NextResponse.json(
        { error: 'Failed to find created roles' },
        { status: 500 }
      )
    }

    const { error: rolePermissionsError } = await supabase
      .from('role_permissions')
      .insert([
        // Admin gets all permissions
        ...permissions.map(p => ({
          role_id: adminRole.id,
          permission_id: p.id,
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })),
        // Agent gets view, create, update permissions
        ...permissions
          .filter(p => p.name !== 'delete_tickets')
          .map(p => ({
            role_id: agentRole.id,
            permission_id: p.id,
            created_by: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })),
        // Customer gets view and create permissions
        ...permissions
          .filter(p => ['view_tickets', 'create_tickets'].includes(p.name))
          .map(p => ({
            role_id: customerRole.id,
            permission_id: p.id,
            created_by: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))
      ])

    if (rolePermissionsError) {
      console.error('Error assigning permissions to roles:', rolePermissionsError)
      return NextResponse.json(
        { error: 'Failed to assign permissions to roles' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Initial setup completed successfully',
      roles,
      permissions
    })
  } catch (error) {
    console.error('Error in POST /api/admin/setup:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 