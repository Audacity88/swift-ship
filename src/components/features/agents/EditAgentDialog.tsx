'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'

interface EditAgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agentId: string
}

interface Agent {
  id: string
  name: string
  email: string
  role: 'agent' | 'admin'
  team_id?: string
  avatar_url?: string
}

export function EditAgentDialog({ open, onOpenChange, agentId }: EditAgentDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [agent, setAgent] = useState<Agent | null>(null)

  useEffect(() => {
    if (open && agentId) {
      fetchAgent()
    }
  }, [open, agentId])

  const fetchAgent = async () => {
    try {
      const response = await fetch(`/api/agents/${agentId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch agent')
      }
      const data = await response.json()
      setAgent(data)
    } catch (error) {
      console.error('Error fetching agent:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch agent details. Please try again.',
        variant: 'destructive',
      })
      onOpenChange(false)
    }
  }

  const handleEditAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agent) return

    setIsLoading(true)

    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: agent.name,
          email: agent.email,
          role: agent.role,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update agent')
      }

      onOpenChange(false)
      
      toast({
        title: 'Success',
        description: 'Agent updated successfully',
      })
      
      router.refresh()
    } catch (error) {
      console.error('Error updating agent:', error)
      toast({
        title: 'Error',
        description: 'Failed to update agent. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!agent) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Agent</DialogTitle>
          <DialogDescription>
            Update the agent's information.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleEditAgent} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Name</label>
            <Input
              value={agent.name}
              onChange={(e) => setAgent(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
              placeholder="Enter agent name"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <Input
              type="email"
              value={agent.email}
              onChange={(e) => setAgent(prev => prev ? ({ ...prev, email: e.target.value }) : null)}
              placeholder="Enter agent email"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Role</label>
            <Select
              value={agent.role}
              onValueChange={(value: 'agent' | 'admin') => 
                setAgent(prev => prev ? ({ ...prev, role: value }) : null)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agent">Support Agent</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Agent'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 