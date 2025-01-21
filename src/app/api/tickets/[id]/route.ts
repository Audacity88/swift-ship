import { NextResponse } from 'next/server'
import type { Ticket, TicketComment } from '@/types/ticket'
import { TicketStatus, TicketPriority } from '@/types/ticket'
import { UserRole } from '@/types/user'

// Mock data - replace with actual database query
const mockTicket: Ticket = {
  id: '1',
  title: 'Unable to access dashboard after recent update',
  subject: 'Unable to access dashboard after recent update',
  description: 'After the latest update, I am unable to access the dashboard. The page loads indefinitely and eventually times out. This is blocking our team from accessing critical metrics.',
  status: TicketStatus.OPEN,
  priority: TicketPriority.HIGH,
  isArchived: false,
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [],
    customFields: {},
    company: 'Acme Corp'
  },
  customerId: '1',
  assigneeId: '2',
  customer: {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: UserRole.CUSTOMER,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  assignee: {
    id: '2',
    name: 'Support Agent',
    email: 'agent@example.com',
    role: UserRole.AGENT,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  comments: [
    {
      id: '1',
      ticketId: '1',
      content: 'Hi, I am experiencing issues accessing the dashboard after the recent update.',
      user: {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: UserRole.CUSTOMER,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      isInternal: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      ticketId: '1',
      content: 'Thank you for reporting this issue. Could you please provide your browser version and any error messages you are seeing?',
      user: {
        id: '2',
        name: 'Support Agent',
        email: 'agent@example.com',
        role: UserRole.AGENT,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      isInternal: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Replace with actual database query
    // For now, just return mock data if ID matches
    if (params.id === '1') {
      return NextResponse.json({ data: mockTicket })
    }

    // Return 404 if ticket not found
    return new NextResponse('Ticket not found', { status: 404 })
  } catch (error) {
    console.error('Failed to fetch ticket:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 