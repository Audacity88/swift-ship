'use client';

import { useState, useEffect } from 'react';
import { RoleType } from '@/types/role';
import { roleService } from '@/lib/services/role-service';
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
import { MoreHorizontal, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RoleListProps {
  onAssignRole?: (role: RoleType) => void;
  onViewPermissions?: (role: RoleType) => void;
}

export const RoleList = ({ onAssignRole, onViewPermissions }: RoleListProps) => {
  const [roles, setRoles] = useState<RoleType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Load roles on component mount
  useEffect(() => {
    const loadRoles = async () => {
      const allRoles = await roleService.getAllRoles();
      setRoles(allRoles);
    };
    loadRoles();
  }, []);

  // Filter roles based on search query
  const filteredRoles = roles.filter(role =>
    role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort roles based on sort order
  const sortedRoles = [...filteredRoles].sort((a, b) => {
    return sortOrder === 'asc'
      ? a.localeCompare(b)
      : b.localeCompare(a);
  });

  const handleSort = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search roles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSort}
        >
          Sort {sortOrder === 'asc' ? '↑' : '↓'}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Role</TableHead>
            <TableHead>Permissions Count</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRoles.map((role) => (
            <TableRow key={role}>
              <TableCell className="font-medium">{role}</TableCell>
              <TableCell>
                {roleService.getDefaultPermissions(role as RoleType).length}
              </TableCell>
              <TableCell>
                <Badge variant={role === 'ADMIN' ? 'default' : 'secondary'}>
                  Active
                </Badge>
              </TableCell>
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
                      onClick={() => onAssignRole?.(role as RoleType)}
                    >
                      Assign Role
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onViewPermissions?.(role as RoleType)}
                    >
                      View Permissions
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