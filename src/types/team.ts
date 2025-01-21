import { UserRole } from './enums';

export interface WorkingHours {
  start: string; // Format: "HH:mm"
  end: string;   // Format: "HH:mm"
}

export interface DaySchedule {
  enabled: boolean;
  startTime: string;
  endTime: string;
  assignedMembers: string[];
}

export interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface TeamSchedule extends WeeklySchedule {
  timezone?: string;
}

export interface TeamMember {
  teamId: string;
  userId: string;
  role: UserRole;
  schedule: WeeklySchedule;
  skills: string[];
  joinedAt: Date;
}

export interface TeamSkillSet {
  name: string;
  level: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
  description?: string;
}

export interface TeamMetrics {
  averageResponseTime: number;  // in minutes
  averageResolutionTime: number; // in minutes
  openTickets: number;
  resolvedTickets: number;
  customerSatisfactionScore: number;
  updatedAt: Date;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  members: TeamMember[];
  schedule: WeeklySchedule;
  skills: TeamSkillSet[];
  metrics: TeamMetrics;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface TeamCreationData {
  name: string;
  description?: string;
  schedule: WeeklySchedule;
  skills?: TeamSkillSet[];
}

export interface TeamUpdateData extends Partial<TeamCreationData> {
  id: string;
  isActive?: boolean;
}

export interface TeamMemberUpdate {
  teamId: string;
  userId: string;
  schedule?: Partial<WeeklySchedule>;
  skills?: string[];
  role?: UserRole;
} 