import { NextResponse } from 'next/server'
import type { Ticket } from '@/types/ticket'

// Mock data - replace with actual database query
const mockTicket: Ticket = {
  id: '1',
  number: 'TICK-1001',
  title: 'Unable to access dashboard after recent update',
  description: 'After the latest update, I am unable to access the dashboard. The page loads indefinitely and eventually times out. This is blocking our team from accessing critical metrics.',
  status: 'open',
  priority: 'high',
  type: 'problem',
  customer: {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
  },
  assignee: {
    id: '1',
    name: 'Support Agent',
    email: 'agent@example.com',
    role: 'agent',
  },
  messages: [
    {
      id: '1',
      content: 'Hi, I am experiencing issues accessing the dashboard after the recent update.',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      author: {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
      },
    },
    {
      id: '2',
      content: 'Thank you for reporting this issue. Could you please provide your browser version and any error messages you are seeing?',
      createdAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
      author: {
        id: '1',
        name: 'Support Agent',
        email: 'agent@example.com',
        role: 'agent',
      },
    },
  ],
  followers: [],
  metadata: {
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
    tags: [
      { id: '1', name: 'bug', color: '#DE350B' },
      { id: '2', name: 'dashboard', color: '#00B8D9' },
    ],
    source: 'web',
    customFields: [
      'Chrome 120.0.0',
      'high'
    ],
  },
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