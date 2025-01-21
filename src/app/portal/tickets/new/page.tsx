'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTicket } from '@/lib/services/ticket-service'
import { useAuth } from '@/lib/hooks/useAuth'
import { TicketPriority, TicketType } from '@/types/ticket'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'

export default function NewTicketPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [description, setDescription] = useState('')

  const generateTitle = (description: string): string => {
    // Take first 50 characters of the description and add ellipsis if needed
    const title = description.split('\n')[0].trim()
    return title.length > 50 ? `${title.substring(0, 47)}...` : title
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!description.trim()) {
      toast.error('Please describe your issue')
      return
    }

    setIsSubmitting(true)

    try {
      const ticketData = {
        title: generateTitle(description),
        description: description.trim(),
        priority: TicketPriority.MEDIUM, // Default priority
        customerId: user?.id as string,
        type: 'question' as TicketType, // Default type
      }

      await createTicket(ticketData)
      toast.success('Your support request has been submitted successfully! We will review it and get back to you soon.')
      router.push('/portal') // Redirect to portal home/inbox instead of ticket details
    } catch (error) {
      console.error('Error creating ticket:', error)
      toast.error('Failed to submit support request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="text-2xl font-bold mb-6">Get Support</h1>
      
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <label 
              htmlFor="description" 
              className="block text-sm font-medium text-gray-700"
            >
              How can we help you today?
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe your issue in detail. Include any relevant information that might help us assist you better."
              className="min-h-[200px]"
              required
            />
          </div>

          <div className="flex items-center justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </Card>

      <div className="mt-6 text-sm text-gray-500">
        <p>
          After submitting your request, our support team will review it and get back to you through your portal inbox.
          You will receive a notification when we respond to your request.
        </p>
      </div>
    </div>
  )
} 