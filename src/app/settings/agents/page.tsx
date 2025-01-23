'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'

interface Agent {
  id: string
  name: string
  email: string
  role: 'agent' | 'admin' | 'supervisor'
  avatar?: string
}

export default function AgentsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newAgent, setNewAgent] = useState<{
    name: string;
    email: string;
    role: 'agent' | 'admin' | 'supervisor';
  }>({
    name: '',
    email: '',
    role: 'agent',
  })

  // Fetch agents on load
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch('/api/agents')
        if (!response.ok) {
          throw new Error('Failed to fetch agents')
        }
        const data = await response.json()
        setAgents(data)
      } catch (error) {
        console.error('Error fetching agents:', error)
        toast({
          title: 'Error',
          description: 'Failed to fetch agents. Please try again.',
          variant: 'destructive',
        })
      }
    }

    fetchAgents()
  }, [toast])

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newAgent),
      })

      if (!response.ok) {
        throw new Error('Failed to add agent')
      }

      const data = await response.json()
      setAgents(prev => [...prev, data])
      setShowAddDialog(false)
      setNewAgent({ name: '', email: '', role: 'agent' })
      
      toast({
        title: 'Success',
        description: 'Agent added successfully',
      })
      
      router.refresh()
    } catch (error) {
      console.error('Error adding agent:', error)
      toast({
        title: 'Error',
        description: 'Failed to add agent. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Filter agents based on search query and role
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = 
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.email.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || agent.role === roleFilter

    return matchesSearch && matchesRole
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Agents</h1>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Agent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Agent</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddAgent} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Name</label>
                <Input
                  value={newAgent.name}
                  onChange={(e) => setNewAgent(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter agent name"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <Input
                  type="email"
                  value={newAgent.email}
                  onChange={(e) => setNewAgent(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter agent email"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Role</label>
                <Select
                  value={newAgent.role}
                  onValueChange={(value: 'agent' | 'admin' | 'supervisor') => 
                    setNewAgent(prev => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Support Agent</SelectItem>
                    <SelectItem value="supervisor">Team Supervisor</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Adding...' : 'Add Agent'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search agents..."
            className="pl-9"
          />
        </div>
        <Select 
          value={roleFilter}
          onValueChange={setRoleFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="agent">Support Agents</SelectItem>
            <SelectItem value="supervisor">Team Supervisors</SelectItem>
            <SelectItem value="admin">Administrators</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Agents List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="grid grid-cols-4 gap-4 p-4 border-b border-gray-200 font-medium text-sm text-gray-500">
          <div>Name</div>
          <div>Email</div>
          <div>Role</div>
          <div>Actions</div>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredAgents.map((agent) => (
            <div key={agent.id} className="grid grid-cols-4 gap-4 p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  {agent.name[0].toUpperCase()}
                </div>
                <span className="font-medium">{agent.name}</span>
              </div>
              <div className="flex items-center">{agent.email}</div>
              <div className="flex items-center">
                <span className="capitalize">{agent.role}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">Edit</Button>
                <Button variant="outline" size="sm">Deactivate</Button>
              </div>
            </div>
          ))}
          {filteredAgents.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              {agents.length === 0 
                ? 'No agents found. Add your first agent to get started.'
                : 'No agents match your search criteria.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 