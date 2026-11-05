'use client'

import { useRef, useState } from 'react'
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
  const [errorMessage, setErrorMessage] = useState('')
  const summaryRef = useRef<HTMLDivElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!description.trim()) {
      setErrorMessage('Please describe your issue before submitting your support request.')
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }

    setErrorMessage('')
    setIsSubmitting(true)

    try {
      const ticketData = {
        title: `Support Request from ${user?.name || 'Customer'}`,
        description: description.trim(),
        priority: TicketPriority.MEDIUM, // Default priority
        customerId: user?.id as string,
        type: 'question' as TicketType, // Default type
      }

      const ticket = await createTicket(undefined, ticketData)
      toast.success('Your support request has been submitted successfully! We will review it and get back to you soon.')
      router.push(`/portal/tickets/${ticket.id}`)
    } catch (error) {
      console.error('Error creating ticket:', error)
      setErrorMessage('Failed to submit support request. Please try again.')
      requestAnimationFrame(() => summaryRef.current?.focus())
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="text-2xl font-bold mb-6">Get Support</h1>
      
      <Card className="p-6">
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {errorMessage && <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded border border-destructive p-4 text-destructive"><p>{errorMessage}</p><button type="button" className="mt-2 underline" onClick={() => descriptionRef.current?.focus()}>Go to issue description</button></div>}
          <div className="space-y-4">
            <label 
              htmlFor="description" 
              className="block text-sm font-medium text-gray-700"
            >
              How can we help you today?
            </label>
            <Textarea
              id="description"
              ref={descriptionRef}
              aria-invalid={!!errorMessage && !description.trim()}
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
          Open your ticket conversation to check for replies.
        </p>
      </div>
    </div>
  )
} 