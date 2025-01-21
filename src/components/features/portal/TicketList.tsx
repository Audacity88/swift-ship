'use client';

import { useState } from 'react';
import { Ticket } from '@/types/ticket';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';

interface TicketListProps {
  tickets: Ticket[];
  onCreateTicket: (ticket: { subject: string; description: string }) => Promise<void>;
  onAddComment: (ticketId: string, comment: string) => Promise<void>;
  onUpdateStatus: (ticketId: string, status: string) => Promise<void>;
  isLoading: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPageChange: (page?: number) => Promise<void>;
  className?: string;
}

export const TicketList = ({
  tickets,
  onCreateTicket,
  onAddComment,
  onUpdateStatus,
  isLoading,
  pagination,
  onPageChange,
  className,
}: TicketListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'status'>('date');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: '', description: '' });
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newComment, setNewComment] = useState('');

  const filteredTickets = tickets
    .filter((ticket) => {
      const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || ticket.status === selectedStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      return a.status.localeCompare(b.status);
    });

  const handleCreateTicket = async () => {
    try {
      await onCreateTicket(newTicket);
      setNewTicket({ subject: '', description: '' });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating ticket:', error);
    }
  };

  const handleAddComment = async () => {
    if (!selectedTicket || !newComment.trim()) return;

    try {
      await onAddComment(selectedTicket.id, newComment);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'bg-blue-500/10 text-blue-500';
      case 'in_progress':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'resolved':
        return 'bg-green-500/10 text-green-500';
      case 'closed':
        return 'bg-gray-500/10 text-gray-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={selectedStatus}
          onValueChange={setSelectedStatus}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={sortBy}
          onValueChange={(value) => setSortBy(value as 'date' | 'status')}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Last Updated</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Ticket</DialogTitle>
              <DialogDescription>
                Submit a new support ticket. We'll get back to you as soon as possible.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTicket} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Ticket'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {filteredTickets.map((ticket) => (
          <Card key={ticket.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{ticket.subject}</CardTitle>
                  <CardDescription>
                    Ticket #{ticket.id.slice(0, 8)} •{' '}
                    {format(new Date(ticket.createdAt), 'MMM d, yyyy')}
                  </CardDescription>
                </div>
                <Badge className={cn('ml-2', getStatusColor(ticket.status))}>
                  {ticket.status.replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {ticket.description}
              </p>
              {ticket.comments && ticket.comments.length > 0 && (
                <div className="mt-4 space-y-4">
                  <h4 className="text-sm font-medium">Comments</h4>
                  <ScrollArea className="h-[200px]">
                    {ticket.comments.map((comment, index) => (
                      <div
                        key={index}
                        className="mb-4 p-3 bg-muted rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">
                            {comment.user.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comment.createdAt), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Select
                value={ticket.status}
                onValueChange={(value) => onUpdateStatus(ticket.id, value)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Update status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Add Comment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Comment</DialogTitle>
                    <DialogDescription>
                      Add a comment to this ticket. This will be visible to support staff.
                    </DialogDescription>
                  </DialogHeader>
                  <div>
                    <Label htmlFor="comment">Comment</Label>
                    <Textarea
                      id="comment"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setNewComment('')}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddComment} disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        'Add Comment'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardFooter>
          </Card>
        ))}

        {filteredTickets.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? (
              <>No tickets found matching "{searchTerm}"</>
            ) : (
              <>No tickets found</>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 