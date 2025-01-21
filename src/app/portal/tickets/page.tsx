'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { TicketList } from '@/components/features/portal/TicketList';
import { customerTicketService } from '@/lib/services/customer-ticket-service';
import type { Ticket, TicketStatus } from '@/types/ticket';
import { useToast } from '@/components/ui/use-toast';

interface TicketListState {
  tickets: Ticket[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  isLoading: boolean;
}

export default function TicketsPage() {
  const { toast } = useToast();
  const [state, setState] = useState<TicketListState>({
    tickets: [],
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    },
    isLoading: true,
  });

  const fetchTickets = async (page = 1) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const response = await customerTicketService.getTickets({ page });
      setState(prev => ({
        ...prev,
        tickets: response.tickets,
        pagination: response.pagination,
      }));
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tickets. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (data: { title: string; description: string }) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await customerTicketService.createTicket(data);
      toast({
        title: 'Success',
        description: 'Ticket created successfully.',
      });
      fetchTickets(1); // Refresh the list
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to create ticket. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleAddComment = async (ticketId: string, content: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await customerTicketService.addComment(ticketId, content);
      toast({
        title: 'Success',
        description: 'Comment added successfully.',
      });
      fetchTickets(state.pagination.page); // Refresh current page
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to add comment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleUpdateStatus = async (ticketId: string, status: TicketStatus) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await customerTicketService.updateTicketStatus(ticketId, status);
      toast({
        title: 'Success',
        description: 'Ticket status updated successfully.',
      });
      fetchTickets(state.pagination.page); // Refresh current page
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update ticket status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <Link href="/portal" className="inline-flex items-center text-muted-foreground hover:text-foreground">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
        <p className="text-muted-foreground">
          View and manage your support tickets
        </p>
      </div>

      <TicketList
        tickets={state.tickets}
        onCreateTicket={handleCreateTicket}
        onAddComment={handleAddComment}
        onUpdateStatus={(ticketId: string, status: string) => 
          handleUpdateStatus(ticketId, status as TicketStatus)
        }
        isLoading={state.isLoading}
        pagination={state.pagination}
        onPageChange={fetchTickets}
      />
    </div>
  );
} 