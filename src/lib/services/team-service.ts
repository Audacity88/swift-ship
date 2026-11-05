import type { Team, TeamCreationData, TeamUpdateData, TeamMember, TeamMemberUpdate, TeamSchedule, TeamAgent, WeeklySchedule } from '@/types/team'
import type { UserRole } from '@/types/role'
import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'

const emptySchedule = (): WeeklySchedule => {
  const day = () => ({ enabled: false, startTime: '09:00', endTime: '17:00', assignedMembers: [] as string[] })
  return { monday: day(), tuesday: day(), wednesday: day(), thursday: day(), friday: day(), saturday: day(), sunday: day() }
}

interface TeamMemberRow {
  team_id: string; user_id: string; role: UserRole; joined_at: string;
  skills?: string[]; schedule?: TeamMember['schedule'];
  agent?: { name: string; email: string } | null;
}
interface TeamRow {
  id: string; name: string; description?: string; is_active: boolean;
  created_at: string; updated_at: string; members?: TeamMemberRow[];
  schedule?: Team['schedule']; skills?: Team['skills']; metrics?: Team['metrics'];
}

export const teamService = {
  async getAvailableAgents(context: ServerContext): Promise<TeamAgent[]> {
    const supabase = getServerSupabase(context)
    const { data, error } = await supabase.from('agents').select('id, name, email').order('name')
    if (error) throw new Error('Unable to load agents. Please try again.')
    return data || []
  },
  async getAllTeams(context: ServerContext): Promise<Team[]> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
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
            agent:agents!team_members_user_id_fkey(name, email),
            skills,
            schedule
          )
        `)
        .returns<TeamRow[]>()

      if (error) {
        console.error('Failed to get all teams:', error)
        throw error
      }

      return (data || []).map((t: TeamRow) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        members: (t.members || []).map((m: TeamMemberRow) => ({
          teamId: m.team_id,
          userId: m.user_id,
          name: m.agent?.name,
          email: m.agent?.email,
          role: m.role as UserRole,
          schedule: m.schedule || emptySchedule(),
          skills: m.skills || [],
          joinedAt: new Date(m.joined_at),
        })),
        schedule: t.schedule || emptySchedule(),
        skills: t.skills || [],
        metrics: t.metrics || {
          averageResponseTime: 0,
          averageResolutionTime: 0,
          openTickets: 0,
          resolvedTickets: 0,
          customerSatisfactionScore: 0,
          updatedAt: new Date()
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
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
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
            agent:agents!team_members_user_id_fkey(name, email),
            skills,
            schedule
          )
        `)
        .eq('id', id)
        .returns<TeamRow[]>()
        .maybeSingle()

      if (error) {
        console.error('Failed to get team:', error)
        throw error
      }

      if (!data) return null

      return {
        id: data.id,
        name: data.name,
        description: data.description,
        members: (data.members || []).map((m: TeamMemberRow) => ({
          teamId: m.team_id,
          userId: m.user_id,
          name: m.agent?.name,
          email: m.agent?.email,
          role: m.role as UserRole,
          schedule: m.schedule || emptySchedule(),
          skills: m.skills || [],
          joinedAt: new Date(m.joined_at),
        })),
        schedule: data.schedule || emptySchedule(),
        skills: data.skills || [],
        metrics: data.metrics || {
          averageResponseTime: 0,
          averageResolutionTime: 0,
          openTickets: 0,
          resolvedTickets: 0,
          customerSatisfactionScore: 0,
          updatedAt: new Date()
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

  async createTeam(context: ServerContext, payload: TeamCreationData & { members?: Omit<TeamMember, 'teamId' | 'joinedAt'>[] }): Promise<Team | null> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
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
            averageResponseTime: 0,
            averageResolutionTime: 0,
            openTickets: 0,
            resolvedTickets: 0,
            customerSatisfactionScore: 0,
            updatedAt: new Date()
          },
          is_active: true,
          created_by: user.id,
          updated_by: user.id,
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
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
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
          updated_by: user.id,
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
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
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
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      const { data, error } = await supabase
        .from('team_members')
        .select(`
          team_id,
          user_id,
          role,
          joined_at,
          agent:agents!team_members_user_id_fkey(name, email),
          skills,
          schedule
        `)
        .eq('team_id', teamId)
        .returns<TeamMemberRow[]>()

      if (error) {
        console.error('Failed to get team members:', error)
        throw error
      }

      return (data || []).map(m => ({
        teamId: m.team_id,
        userId: m.user_id,
        name: m.agent?.name,
        email: m.agent?.email,
        role: m.role as UserRole,
        schedule: m.schedule || emptySchedule(),
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
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
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
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
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

  async updateTeamMember(update: TeamMemberUpdate): Promise<boolean> {
    try {
      const supabase = getServerSupabase(undefined)
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
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

  async getTeamSchedule(teamId: string): Promise<Partial<TeamSchedule>> {
    const supabase = getServerSupabase(undefined)
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

  async updateTeamSchedule(teamId: string, schedule: TeamSchedule): Promise<boolean> {
    const supabase = getServerSupabase(undefined)
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
