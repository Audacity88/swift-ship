'use client';

import { useState, useEffect } from 'react';
import type { Team } from '@/types/team';
import { teamService } from '@/lib/services/team-service';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MoreHorizontal,
  Search,
  Users,
  Calendar,
  BarChart,
  Trash,
  Edit,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TeamListProps {
  onCreateTeam?: () => void;
  onEditTeam?: (teamId: string) => void;
  onViewMembers?: (teamId: string) => void;
  onViewSchedule?: (teamId: string) => void;
  onViewMetrics?: (teamId: string) => void;
  onDeleteTeam?: (teamId: string) => void;
}

export const TeamList = ({
  onCreateTeam,
  onEditTeam,
  onViewMembers,
  onViewSchedule,
  onViewMetrics,
  onDeleteTeam,
}: TeamListProps) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof Team>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load teams on component mount
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const allTeams = await teamService.getAllTeams();
        setTeams(allTeams);
        setError(null);
      } catch (err) {
        const error = err as Error;
        setError(error.message || 'Failed to load teams');
        console.error('Failed to load teams:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTeams();
  }, []);

  // Filter teams based on search query
  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort teams based on sort field and order
  const sortedTeams = [...filteredTeams].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return 0;
  });

  const handleSort = (field: keyof Team) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getTeamStatusBadge = (team: Team) => {
    const memberCount = team.members.length;
    if (!team.isActive) {
      return <Badge variant="destructive">Inactive</Badge>;
    }
    if (memberCount === 0) {
      return <Badge variant="outline">Empty</Badge>;
    }
    return <Badge variant="default">{memberCount} Members</Badge>;
  };

  const getMetricsSummary = (team: Team) => {
    if (!team.metrics) return 'No metrics';
    return `${team.metrics.resolvedTickets} resolved / ${team.metrics.openTickets} open`;
  };

  if (loading) {
    return <div className="text-center py-8">Loading teams...</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button onClick={onCreateTeam}>Create Team</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="cursor-pointer"
              onClick={() => handleSort('name')}
            >
              Name {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Metrics</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTeams.map((team) => (
            <TableRow key={team.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{team.name}</div>
                  {team.description && (
                    <div className="text-sm text-muted-foreground">
                      {team.description}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>{getTeamStatusBadge(team)}</TableCell>
              <TableCell>{getMetricsSummary(team)}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => onEditTeam?.(team.id)}
                      className="cursor-pointer"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Team
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onViewMembers?.(team.id)}
                      className="cursor-pointer"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      View Members
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onViewSchedule?.(team.id)}
                      className="cursor-pointer"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Schedule
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onViewMetrics?.(team.id)}
                      className="cursor-pointer"
                    >
                      <BarChart className="mr-2 h-4 w-4" />
                      Metrics
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDeleteTeam?.(team.id)}
                      className="cursor-pointer text-destructive"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Delete Team
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}; 