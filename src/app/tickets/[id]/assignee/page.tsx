'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import { Search, UserPlus, History, Check, RefreshCw } from 'lucide-react'
import type { Agent } from '@/types/ticket'
import { useAuth } from '@/lib/hooks/useAuth'

export default function TicketAssigneePage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const [isPending, startTransition] = useTransition()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [isAssigning, setIsAssigning] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [currentAssignee, setCurrentAssignee] = useState<Agent | null>(null)
  const [assignmentHistory, setAssignmentHistory] = useState<Array<{
    id: string
    agent: {
      name: string
      avatar?: string
    }
    assignedBy: {
      name: string
    }
    assignedAt: string
  }>>([])
  const [isSuccess, setIsSuccess] = useState(false)

  const ticketId = params?.id as string

  const handleAssign = async () => {
    if (!selectedAgent || isAssigning) return
    
    setIsAssigning(true)
    try {
      const response = await fetch('/api/tickets/' + ticketId, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ assigneeId: selectedAgent }),
        credentials: 'include'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to assign ticket')
      }

      const updatedTicket = await response.json()
      
      // Update current assignee
      const selectedAgentData = agents.find(agent => agent.id === selectedAgent)
      if (selectedAgentData) {
        setCurrentAssignee(selectedAgentData)
      }

      // Refresh the assignment history
      const historyResponse = await fetch('/api/tickets/' + ticketId + '/assignment-history', {
        credentials: 'include'
      })
      
      if (historyResponse.ok) {
        const newHistory = await historyResponse.json()
        setAssignmentHistory(newHistory)
      }

      setIsSuccess(true)
      setIsAssigning(false)
      
    } catch (error) {
      console.error('Failed to assign ticket:', error)
      setIsAssigning(false)
      alert(error instanceof Error ? error.message : 'Failed to assign ticket')
    }
  }

  useEffect(() => {
    let mounted = true

    const loadData = async () => {
      if (!user) {
        if (mounted) setDataLoading(false)
        return
      }

      try {
        // Fetch all required data in parallel
        const [agentsResponse, historyResponse, ticketResponse] = await Promise.all([
          fetch('/api/agents', { credentials: 'include' }),
          fetch('/api/tickets/' + ticketId + '/assignment-history', { credentials: 'include' }),
          fetch('/api/tickets/' + ticketId, { 
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            },
            credentials: 'include'
          })
        ])

        if (!mounted) return

        if (!agentsResponse.ok || !historyResponse.ok || !ticketResponse.ok) {
          throw new Error('Failed to fetch data')
        }

        const [agentsData, historyData, ticketData] = await Promise.all([
          agentsResponse.json(),
          historyResponse.json(),
          ticketResponse.json()
        ])

        if (mounted) {
          setAgents(agentsData)
          setAssignmentHistory(historyData)
          
          // Set current assignee from ticket data
          if (ticketData.ticket?.assignee_id) {
            const currentAssignee = agentsData.find(
              (agent: Agent) => agent.id === ticketData.ticket.assignee_id
            )
            setCurrentAssignee(currentAssignee || null)
            // Also set the selected agent to match current assignee
            setSelectedAgent(ticketData.ticket.assignee_id)
          } else {
            setCurrentAssignee(null)
            setSelectedAgent(null)
          }
        }
      } catch (error) {
        console.error('Failed to initialize data:', error)
      } finally {
        if (mounted) {
          setDataLoading(false)
        }
      }
    }

    void loadData()
    return () => { mounted = false }
  }, [user, ticketId])

  const filteredAgents = agents.filter((agent) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      agent.name.toLowerCase().includes(query) ||
      agent.email.toLowerCase().includes(query)
    )
  })

  if (!user) {
    return null
  }

  if (dataLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-full flex items-center justify-center h-64">
          <div className="animate-spin">
            <RefreshCw className="w-6 h-6 text-primary" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Agent Selection */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Assign Ticket</h2>
              {currentAssignee && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Currently assigned to: <span className="font-medium">{currentAssignee.name}</span>
                </p>
              )}
            </div>
            {isSuccess ? (
              <div className="text-green-600 dark:text-green-400 font-medium">✓ Successfully assigned</div>
            ) : (
              <button
                onClick={handleAssign}
                disabled={!selectedAgent || isAssigning}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white \
                  bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#0052CC' }}
              >
                {isAssigning ? (
                  'Assigning...'
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Assign
                  </>
                )}
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agents..."
              className="w-full pl-10 pr-4 py-2 text-base border border-gray-200 dark:border-gray-700 \
                bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg \
                focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent \
                placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          {/* Agents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAgents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => {
                  setSelectedAgent(selectedAgent === agent.id ? null : agent.id);
                  setIsSuccess(false);  // Reset success message when selecting a different agent
                }}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                  selectedAgent === agent.id
                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                style={selectedAgent === agent.id ? { borderColor: '#0052CC' } : {}}
              >
                <div className="relative w-10 h-10 rounded-full overflow-hidden">
                  <Image
                    src={agent.avatar || '/images/default-avatar.png'}
                    alt={agent.name}
                    width={32}
                    height={32}
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-medium text-gray-900 dark:text-white">{agent.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{agent.email}</p>
                </div>
                {selectedAgent === agent.id && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Assignment History */}
      <div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <History className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Assignment History</h2>
          </div>

          <div className="space-y-6">
            {assignmentHistory.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No assignment history</p>
            ) : (
              assignmentHistory.map((entry) => (
                <div key={entry.id} className="flex items-start gap-4">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                    <Image
                      src={entry.agent.avatar || '/images/default-avatar.png'}
                      alt={entry.agent.name}
                      width={32}
                      height={32}
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">
                      Assigned to <span className="font-medium">{entry.agent.name}</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      by {entry.assignedBy.name} on {new Date(entry.assignedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}