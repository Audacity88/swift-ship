import { createClient } from '@supabase/supabase-js';
import { 
  Team, TeamCreationData, TeamUpdateData, TeamMember, TeamMemberUpdate,
  WeeklySchedule, TeamSkillSet, TeamMetrics
} from '@/types/team';
import { 
  TeamPerformanceMetrics, AgentPerformanceMetrics, MetricsQuery,
  MetricsPeriod
} from '@/types/metrics';
import { UserRole } from '@/types/role';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export class TeamService {
  // Team CRUD Operations
  async getAllTeams(): Promise<Team[]> {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('isActive', true);

    if (error) throw error;
    return data || [];
  }

  async getTeamById(teamId: string): Promise<Team | null> {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        members:team_members(*)
      `)
      .eq('id', teamId)
      .single();

    if (error || !data) return null;
    return this.mapDatabaseTeamToTeam(data);
  }

  async createTeam(teamData: TeamCreationData): Promise<Team | null> {
    const { data, error } = await supabase
      .from('teams')
      .insert({
        name: teamData.name,
        description: teamData.description,
        schedule: teamData.schedule,
        skills: teamData.skills || [],
        isActive: true,
      })
      .select()
      .single();

    if (error || !data) return null;
    return this.mapDatabaseTeamToTeam(data);
  }

  async updateTeam(teamData: TeamUpdateData): Promise<boolean> {
    const { error } = await supabase
      .from('teams')
      .update({
        name: teamData.name,
        description: teamData.description,
        schedule: teamData.schedule,
        skills: teamData.skills,
        isActive: teamData.isActive,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', teamData.id);

    return !error;
  }

  async deleteTeam(teamId: string): Promise<boolean> {
    const { error } = await supabase
      .from('teams')
      .update({ isActive: false })
      .eq('id', teamId);

    return !error;
  }

  // Member Management
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('teamId', teamId);

    if (error) throw error;
    return data || [];
  }

  async addTeamMember(member: TeamMember): Promise<boolean> {
    const { error } = await supabase
      .from('team_members')
      .insert({
        teamId: member.teamId,
        userId: member.userId,
        role: member.role,
        schedule: member.schedule,
        skills: member.skills,
        joinedAt: new Date().toISOString(),
      });

    return !error;
  }

  async updateTeamMember(update: TeamMemberUpdate): Promise<boolean> {
    const { error } = await supabase
      .from('team_members')
      .update({
        role: update.role,
        schedule: update.schedule,
        skills: update.skills,
      })
      .match({ teamId: update.teamId, userId: update.userId });

    return !error;
  }

  async removeTeamMember(teamId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .match({ teamId, userId });

    return !error;
  }

  // Schedule Management
  async getTeamSchedule(teamId: string): Promise<WeeklySchedule | null> {
    const { data, error } = await supabase
      .from('teams')
      .select('schedule')
      .eq('id', teamId)
      .single();

    if (error || !data) return null;
    return data.schedule;
  }

  async updateTeamSchedule(teamId: string, schedule: WeeklySchedule): Promise<boolean> {
    const { error } = await supabase
      .from('teams')
      .update({ schedule })
      .eq('id', teamId);

    return !error;
  }

  // Performance Tracking & Metrics
  async getTeamMetrics(teamId: string, query: MetricsQuery): Promise<TeamPerformanceMetrics | null> {
    const { data, error } = await supabase
      .from('team_metrics')
      .select('*')
      .eq('teamId', teamId)
      .gte('period.start', query.startDate?.toISOString())
      .lte('period.end', query.endDate?.toISOString())
      .order('period.start', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return data;
  }

  async getAgentMetrics(teamId: string, userId: string, query: MetricsQuery): Promise<AgentPerformanceMetrics | null> {
    const { data, error } = await supabase
      .from('agent_metrics')
      .select('*')
      .match({ teamId, userId })
      .gte('period.start', query.startDate?.toISOString())
      .lte('period.end', query.endDate?.toISOString())
      .order('period.start', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return data;
  }

  async updateTeamMetrics(metrics: TeamPerformanceMetrics): Promise<boolean> {
    const { error } = await supabase
      .from('team_metrics')
      .upsert({
        ...metrics,
        updatedAt: new Date().toISOString(),
      });

    return !error;
  }

  // Team Availability
  async getAvailableAgents(teamId: string): Promise<TeamMember[]> {
    const now = new Date();
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentTime = now.toLocaleTimeString('en-US', { hour12: false });

    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('teamId', teamId)
      .contains('schedule', {
        [dayOfWeek]: {
          start: { $lte: currentTime },
          end: { $gt: currentTime }
        }
      });

    if (error) throw error;
    return data || [];
  }

  async isTeamAvailable(teamId: string): Promise<boolean> {
    const availableAgents = await this.getAvailableAgents(teamId);
    return availableAgents.length > 0;
  }

  // Helper Methods
  private mapDatabaseTeamToTeam(dbTeam: any): Team {
    return {
      id: dbTeam.id,
      name: dbTeam.name,
      description: dbTeam.description,
      members: dbTeam.members || [],
      schedule: dbTeam.schedule,
      skills: dbTeam.skills || [],
      metrics: dbTeam.metrics,
      createdAt: new Date(dbTeam.createdAt),
      updatedAt: new Date(dbTeam.updatedAt),
      isActive: dbTeam.isActive,
    };
  }
}

// Export singleton instance
export const teamService = new TeamService(); 