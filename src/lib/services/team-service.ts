import { supabase } from '@/lib/supabase'
import type { Team, TeamCreationData, TeamUpdateData, TeamMember } from '@/types/team'
import { UserRole } from '@/types/role'

export const teamService = {
  async getAllTeams(): Promise<Team[]> {
    // Matches usage in TeamList to show teams
    const { data, error } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        description,
        schedule,
        skills,
        metrics,
        created_at,
        updated_at,
        is_active,
        members:team_members (
          team_id,
          user_id,
          role,
          joined_at,
          skills,
          schedule
        )
      `)

    if (error) {
      console.error('Failed to get all teams:', error)
      return []
    }

    // Transform data to match the Team interface
    return (data || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      members: (t.members || []).map((m: any) => ({
        teamId: m.team_id,
        userId: m.user_id,
        role: m.role as UserRole,
        schedule: m.schedule || {},
        skills: m.skills || [],
        joinedAt: new Date(m.joined_at),
      })),
      schedule: t.schedule || {},
      skills: t.skills || [],
      metrics: t.metrics || {
        averageResponseTime: 0,
        averageResolutionTime: 0,
        openTickets: 0,
        resolvedTickets: 0,
        customerSatisfactionScore: 0,
        updatedAt: new Date(),
      },
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      isActive: t.is_active,
    }))
  },

  async getTeamById(id: string): Promise<Team | null> {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        description,
        schedule,
        skills,
        metrics,
        created_at,
        updated_at,
        is_active,
        members:team_members (
          team_id,
          user_id,
          role,
          joined_at,
          skills,
          schedule
        )
      `)
      .eq('id', id)
      .single()

    if (error || !data) {
      console.error('Failed to get team by id:', error)
      return null
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      members: (data.members || []).map((m: any) => ({
        teamId: m.team_id,
        userId: m.user_id,
        role: m.role as UserRole,
        schedule: m.schedule || {},
        skills: m.skills || [],
        joinedAt: new Date(m.joined_at),
      })),
      schedule: data.schedule || {},
      skills: data.skills || [],
      metrics: data.metrics || {
        averageResponseTime: 0,
        averageResolutionTime: 0,
        openTickets: 0,
        resolvedTickets: 0,
        customerSatisfactionScore: 0,
        updatedAt: new Date(),
      },
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      isActive: data.is_active,
    }
  },

  async createTeam(payload: TeamCreationData): Promise<Team | null> {
    // Insert a new team record
    const { data, error } = await supabase
      .from('teams')
      .insert({
        name: payload.name,
        description: payload.description || '',
        schedule: payload.schedule,
        skills: payload.skills || [],
        is_active: true,
      })
      .select()
      .single()

    if (error || !data) {
      console.error('Failed to create team:', error)
      return null
    }

    // Return the newly created team
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      members: [],
      schedule: data.schedule || {},
      skills: data.skills || [],
      metrics: {
        averageResponseTime: 0,
        averageResolutionTime: 0,
        openTickets: 0,
        resolvedTickets: 0,
        customerSatisfactionScore: 0,
        updatedAt: new Date(),
      },
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      isActive: data.is_active,
    }
  },

  async updateTeam(payload: TeamUpdateData): Promise<boolean> {
    // Update an existing team
    const { error } = await supabase
      .from('teams')
      .update({
        name: payload.name,
        description: payload.description,
        is_active: payload.isActive,
      })
      .eq('id', payload.id)

    if (error) {
      console.error('Failed to update team:', error)
      return false
    }
    return true
  },

  async deleteTeam(teamId: string): Promise<boolean> {
    // Delete a team record
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId)

    if (error) {
      console.error('Failed to delete team:', error)
      return false
    }
    return true
  },

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    // Return a list of team_members
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        team_id,
        user_id,
        role,
        schedule,
        skills,
        joined_at
      `)
      .eq('team_id', teamId)

    if (error) {
      console.error('Failed to get team members:', error)
      return []
    }

    return (data || []).map((m: any) => ({
      teamId: m.team_id,
      userId: m.user_id,
      role: m.role as UserRole,
      schedule: m.schedule || {},
      skills: m.skills || [],
      joinedAt: new Date(m.joined_at),
    }))
  },

  async addTeamMember(member: TeamMember): Promise<boolean> {
    // Insert a new team member
    const { error } = await supabase
      .from('team_members')
      .insert({
        team_id: member.teamId,
        user_id: member.userId,
        role: member.role,
        schedule: member.schedule,
        skills: member.skills,
        joined_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Failed to add team member:', error)
      return false
    }
    return true
  },

  async removeTeamMember(teamId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId)

    if (error) {
      console.error('Failed to remove team member:', error)
      return false
    }
    return true
  },

  async updateTeamMember(update: { teamId: string; userId: string; role?: UserRole; schedule?: any; skills?: string[] }): Promise<boolean> {
    const { error } = await supabase
      .from('team_members')
      .update({
        role: update.role,
        schedule: update.schedule,
        skills: update.skills,
      })
      .eq('team_id', update.teamId)
      .eq('user_id', update.userId)

    if (error) {
      console.error('Failed to update team member:', error)
      return false
    }
    return true
  },

  async getTeamSchedule(teamId: string): Promise<any> {
    // In this example, we store schedule on the teams table or in a separate table. We'll assume it's on `teams`.
    const { data, error } = await supabase
      .from('teams')
      .select('schedule, timezone')
      .eq('id', teamId)
      .single()

    if (error || !data) {
      console.error('Failed to get team schedule:', error)
      return {}
    }
    return {
      ...data.schedule,
      timezone: data.timezone || 'UTC',
    }
  },

  async updateTeamSchedule(teamId: string, schedule: any): Promise<boolean> {
    // Update schedule field in teams table
    const { error } = await supabase
      .from('teams')
      .update({
        schedule: {
          monday: schedule.monday,
          tuesday: schedule.tuesday,
          wednesday: schedule.wednesday,
          thursday: schedule.thursday,
          friday: schedule.friday,
          saturday: schedule.saturday,
          sunday: schedule.sunday,
        },
        timezone: schedule.timezone,
      })
      .eq('id', teamId)

    if (error) {
      console.error('Failed to update team schedule:', error)
      return false
    }
    return true
  },
}