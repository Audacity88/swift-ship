'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { quoteService } from '@/lib/services/quote-service'
import { ticketService } from '@/lib/services'
import { QuoteDetailView } from '@/components/features/quotes/QuoteDetailView'
import { useRouter } from 'next/navigation'

export default function QuotesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch quote requests
  const { data: quotes, isLoading, refetch } = useQuery({
    queryKey: ['quotes', activeTab, searchTerm],
    queryFn: async () => {
      return quoteService.fetchQuotes({}, {
        status: activeTab === 'pending' ? 'open' : 'in_progress',
        searchTerm
      })
    }
  })

  // Submit quote price
  const handleSubmitQuote = async (quoteId: string, price: number) => {
    try {
      await quoteService.submitQuote({}, quoteId, price)
      
      toast({
        title: 'Quote submitted',
        description: 'The customer has been notified of the quote.',
      })

      refetch()
    } catch (error) {
      console.error('Error submitting quote:', error)
      toast({
        title: 'Error',
        description: 'Failed to submit quote. Please try again.',
        variant: 'destructive',
      })
    }
  }

  // Handle edit quote
  const handleEditQuote = (quote: any) => {
    router.push(`/admin/quotes/${quote.id}/edit`)
  }

  // Handle delete quote
  const handleDeleteQuote = async (quoteId: string) => {
    if (!confirm('Are you sure you want to delete this quote request?')) return

    try {
      setIsDeleting(true)
      await ticketService.updateTicket({}, quoteId, {
        status: 'closed',
        is_archived: true
      })
      
      toast({
        title: 'Quote deleted',
        description: 'The quote has been archived.',
      })

      refetch()
    } catch (error) {
      console.error('Error deleting quote:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete quote. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Quote Requests</h1>
        <Input
          type="search"
          placeholder="Search by customer name or email..."
          className="max-w-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending Quotes</TabsTrigger>
          <TabsTrigger value="quoted">Quoted</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {isLoading ? (
            <div>Loading...</div>
          ) : quotes?.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No pending quote requests
            </div>
          ) : (
            quotes?.map((quote) => (
              <QuoteDetailView
                key={quote.id}
                quote={quote}
                onSubmitQuote={handleSubmitQuote}
                onEditQuote={handleEditQuote}
                onDeleteQuote={handleDeleteQuote}
                mode="pending"
                isAdmin={true}
                isDeleting={isDeleting}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="quoted" className="space-y-4">
          {isLoading ? (
            <div>Loading...</div>
          ) : quotes?.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No quoted requests
            </div>
          ) : (
            quotes?.map((quote) => (
              <QuoteDetailView
                key={quote.id}
                quote={quote}
                onEditQuote={handleEditQuote}
                onDeleteQuote={handleDeleteQuote}
                mode="quoted"
                isAdmin={true}
                isDeleting={isDeleting}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
} 