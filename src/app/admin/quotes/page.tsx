'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { quoteService } from '@/lib/services/quote-service'
import { QuoteDetailView } from '@/components/features/quotes/QuoteDetailView'

export default function QuotesPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('pending')
  const [searchTerm, setSearchTerm] = useState('')

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

  // Create shipment from quote
  const handleCreateShipment = async (quoteId: string) => {
    try {
      const quote = quotes?.find(q => q.id === quoteId)
      if (!quote) throw new Error('Quote not found')

      const shipmentData = {
        quote_id: quoteId,
        type: 'standard', // Or get from quote metadata
        origin: quote.metadata.destination.from,
        destination: quote.metadata.destination.to,
        scheduled_pickup: quote.metadata.destination.pickupDate,
        estimated_delivery: quote.metadata.destination.pickupDate // TODO: Calculate based on service level
      }
      
      console.log('Sending shipment creation request:', shipmentData)
      
      const response = await fetch('/api/shipments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(shipmentData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Failed to create shipment:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        toast({
          title: 'Error',
          description: 'Failed to create shipment. Please try again.',
          variant: 'destructive'
        })
        return
      }

      const shipment = await response.json()
      console.log('Shipment created successfully:', shipment)
      toast({
        title: 'Success',
        description: 'Shipment created successfully!'
      })
      
      // Refresh quotes list
      await refetch()
    } catch (error) {
      console.error('Error creating shipment:', error)
      toast({
        title: 'Error',
        description: 'An error occurred while creating the shipment.',
        variant: 'destructive'
      })
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
                mode="pending"
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
                onCreateShipment={handleCreateShipment}
                mode="quoted"
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
} 