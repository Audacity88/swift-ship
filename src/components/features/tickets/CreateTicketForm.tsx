'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CustomerSearch } from '@/components/features/customers/CustomerSearch'
import { TagSelect } from '@/components/features/tags/TagSelect'
import { createTicket, TicketPriority } from '@/lib/services'
import { useToast } from '@/components/ui/use-toast'

const ticketFormSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  priority: z.nativeEnum(TicketPriority),
  customerId: z.string().min(1),
  assigneeId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).optional()
})

type TicketFormData = z.infer<typeof ticketFormSchema>

interface CreateTicketFormProps {
  onSubmit?: (data: TicketFormData) => Promise<void>
  onSuccess?: () => void
}

export function CreateTicketForm({ onSubmit: externalSubmit, onSuccess }: CreateTicketFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketFormSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      description: '',
      priority: TicketPriority.MEDIUM,
      customerId: '',
      assigneeId: '',
      tags: [],
      metadata: {}
    }
  })

  const onSubmit = async (data: TicketFormData) => {
    try {
      setIsSubmitting(true)
      
      // Log the form data
      console.log('Form data before submission:', data)

      // Validate required fields
      if (!data.title?.trim()) {
        throw new Error('Title is required')
      }
      if (!data.description?.trim()) {
        throw new Error('Description is required')
      }
      if (!data.customerId) {
        throw new Error('Customer is required')
      }
      if (!data.priority) {
        throw new Error('Priority is required')
      }

      // Clean up the data
      const cleanData = {
        ...data,
        title: data.title.trim(),
        description: data.description.trim(),
        priority: data.priority,
        customerId: data.customerId,
        assigneeId: data.assigneeId?.trim() || undefined,
        tags: data.tags || [],
        metadata: data.metadata || {}
      }

      // Log the cleaned data
      console.log('Form data after cleanup:', cleanData)

      if (externalSubmit) {
        await externalSubmit(cleanData)
      } else {
        await createTicket(cleanData)
      }

      toast({
        title: 'Success',
        description: 'Ticket created successfully',
        variant: 'default'
      })
      form.reset()
      onSuccess?.()
    } catch (error) {
      console.error('Failed to create ticket:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create ticket',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter ticket title" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Enter ticket description" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select 
                value={field.value} 
                onValueChange={(value) => {
                  field.onChange(value)
                  form.trigger('priority')
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.values(TicketPriority).map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="customerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer</FormLabel>
              <FormControl>
                <CustomerSearch
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value)
                    form.trigger('customerId')
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="assigneeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assignee (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  {...field}
                  value={field.value || ''}
                  placeholder="Enter assignee ID"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags (Optional)</FormLabel>
              <FormControl>
                <TagSelect
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value)
                    form.trigger('tags')
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Ticket'}
        </Button>
      </form>
    </Form>
  )
} 