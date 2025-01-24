'use client'

import { useState } from 'react'
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

interface AddAgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddAgentDialog({ open, onOpenChange }: AddAgentDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [newAgent, setNewAgent] = useState<{
    name: string;
    email: string;
    role: 'agent' | 'admin';
  }>({
    name: '',
    email: '',
    role: 'agent',
  })

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

      setNewAgent({ name: '', email: '', role: 'agent' })
      onOpenChange(false)
      
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Agent</DialogTitle>
          <DialogDescription>
            Create a new support agent account. They will receive an email to set up their password.
          </DialogDescription>
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
              onValueChange={(value: 'agent' | 'admin') => 
                setNewAgent(prev => ({ ...prev, role: value }))
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
              {isLoading ? 'Adding...' : 'Add Agent'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 