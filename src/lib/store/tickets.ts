import { create } from 'zustand'
import { Ticket, TicketStatus, TicketPriority } from '@/types/ticket'

interface TicketState {
  tickets: Ticket[]
  isLoading: boolean
  error: string | null
  createTicket: (data: { title: string; status: TicketStatus; priority: TicketPriority }) => Promise<Ticket | null>
  updateTicket: (id: string, data: Partial<Ticket>) => Promise<Ticket | null>
  deleteTicket: (id: string) => Promise<boolean>
}

export const useTicketStore = create<TicketState>((set, get) => ({
  tickets: [],
  isLoading: false,
  error: null,

  createTicket: async (data) => {
    try {
      set({ isLoading: true, error: null })
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create ticket')
      }
      
      const ticket = await response.json()
      set((state) => ({ tickets: [...state.tickets, ticket] }))
      return ticket
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to create ticket' })
      return null
    } finally {
      set({ isLoading: false })
    }
  },

  updateTicket: async (id, data) => {
    try {
      set({ isLoading: true, error: null })
      const response = await fetch(`/api/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        throw new Error('Failed to update ticket')
      }
      
      const updatedTicket = await response.json()
      set((state) => ({
        tickets: state.tickets.map((t) => (t.id === id ? updatedTicket : t)),
      }))
      return updatedTicket
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update ticket' })
      return null
    } finally {
      set({ isLoading: false })
    }
  },

  deleteTicket: async (id) => {
    try {
      set({ isLoading: true, error: null })
      const response = await fetch(`/api/tickets/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete ticket')
      }
      
      set((state) => ({
        tickets: state.tickets.filter((t) => t.id !== id),
      }))
      return true
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to delete ticket' })
      return false
    } finally {
      set({ isLoading: false })
    }
  },
})) 