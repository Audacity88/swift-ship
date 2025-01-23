import type { Team, TeamCreationData, TeamUpdateData, TeamMember } from '@/types/team'
import { UserRole } from '@/types/role'
import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'

export const teamService = {
  async getAllTeams(context: ServerContext): Promise<Team[]> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

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
        throw error
      }

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
          responseTime: 0,
          resolutionRate: 0,
          customerSatisfaction: 0
        },
        isActive: t.is_active,
        createdAt: new Date(t.created_at),
        updatedAt: new Date(t.updated_at)
      }))
    } catch (error) {
      console.error('Error in getAllTeams:', error)
      throw error
    }
  },

  async getTeamById(context: ServerContext, id: string): Promise<Team | null> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

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

      if (error) {
        console.error('Failed to get team:', error)
        throw error
      }

      if (!data) return null

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
          responseTime: 0,
          resolutionRate: 0,
          customerSatisfaction: 0
        },
        isActive: data.is_active,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      }
    } catch (error) {
      console.error('Error in getTeamById:', error)
      throw error
    }
  },

  async createTeam(context: ServerContext, payload: TeamCreationData): Promise<Team | null> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const { data, error } = await supabase
        .from('teams')
        .insert({
          name: payload.name,
          description: payload.description,
          schedule: payload.schedule || {},
          skills: payload.skills || [],
          metrics: {
            responseTime: 0,
            resolutionRate: 0,
            customerSatisfaction: 0
          },
          is_active: true,
          created_by: session.user.id,
          updated_by: session.user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to create team:', error)
        throw error
      }

      if (payload.members?.length) {
        const { error: membersError } = await supabase
          .from('team_members')
          .insert(
            payload.members.map(member => ({
              team_id: data.id,
              user_id: member.userId,
              role: member.role,
              skills: member.skills || [],
              schedule: member.schedule || {},
              joined_at: new Date().toISOString()
            }))
          )

        if (membersError) {
          console.error('Failed to add team members:', membersError)
          throw membersError
        }
      }

      return this.getTeamById(context, data.id)
    } catch (error) {
      console.error('Error in createTeam:', error)
      throw error
    }
  },

  async updateTeam(context: ServerContext, payload: TeamUpdateData): Promise<boolean> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const { error } = await supabase
        .from('teams')
        .update({
          name: payload.name,
          description: payload.description,
          schedule: payload.schedule,
          skills: payload.skills,
          is_active: payload.isActive,
          updated_by: session.user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', payload.id)

      if (error) {
        console.error('Failed to update team:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('Error in updateTeam:', error)
      throw error
    }
  },

  async deleteTeam(context: ServerContext, id: string): Promise<boolean> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      // First delete all team members
      const { error: membersError } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', id)

      if (membersError) {
        console.error('Failed to delete team members:', membersError)
        throw membersError
      }

      // Then delete the team
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Failed to delete team:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('Error in deleteTeam:', error)
      throw error
    }
  },

  async getTeamMembers(context: ServerContext, teamId: string): Promise<TeamMember[]> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const { data, error } = await supabase
        .from('team_members')
        .select(`
          team_id,
          user_id,
          role,
          joined_at,
          skills,
          schedule
        `)
        .eq('team_id', teamId)

      if (error) {
        console.error('Failed to get team members:', error)
        throw error
      }

      return (data || []).map(m => ({
        teamId: m.team_id,
        userId: m.user_id,
        role: m.role as UserRole,
        schedule: m.schedule || {},
        skills: m.skills || [],
        joinedAt: new Date(m.joined_at)
      }))
    } catch (error) {
      console.error('Error in getTeamMembers:', error)
      throw error
    }
  },

  async addTeamMember(context: ServerContext, teamId: string, member: Omit<TeamMember, 'teamId' | 'joinedAt'>): Promise<boolean> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const { error } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: member.userId,
          role: member.role,
          skills: member.skills || [],
          schedule: member.schedule || {},
          joined_at: new Date().toISOString()
        })

      if (error) {
        console.error('Failed to add team member:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('Error in addTeamMember:', error)
      throw error
    }
  },

  async removeTeamMember(context: ServerContext, teamId: string, userId: string): Promise<boolean> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId)

      if (error) {
        console.error('Failed to remove team member:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('Error in removeTeamMember:', error)
      throw error
    }
  },

  async updateTeamMember(update: { teamId: string; userId: string; role?: UserRole; schedule?: any; skills?: string[] }): Promise<boolean> {
    try {
      const supabase = getServerSupabase(context)
      const session = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const { error } = await supabase
        .from('team_members')
        .update({
          role: update.role,
          schedule: update.schedule,
          skills: update.skills
        })
        .eq('team_id', update.teamId)
        .eq('user_id', update.userId)

      if (error) {
        console.error('Failed to update team member:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('Error in updateTeamMember:', error)
      throw error
    }
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