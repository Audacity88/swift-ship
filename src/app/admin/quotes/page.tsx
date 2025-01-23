'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format } from 'date-fns'
import { Package, MapPin, Calendar, DollarSign, Truck } from 'lucide-react'
import { quoteService } from '@/lib/services/quote-service'
import type { QuoteRequest } from '@/types/quote'

// Utility function to safely parse dates
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Not specified'
  try {
    const date = new Date(dateString)
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date'
    }
    return format(date, 'MMM d, yyyy')
  } catch (error) {
    return 'Invalid date'
  }
}

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
      const shipmentData = {
        quote_id: quoteId,
        type: 'standard', // Or get from quote metadata
        origin: quote.metadata.origin,
        destination: quote.metadata.destination,
        scheduled_pickup: quote.metadata.pickup_date,
        estimated_delivery: quote.metadata.delivery_date
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
        toast.error('Failed to create shipment. Please try again.')
        return
      }

      const shipment = await response.json()
      console.log('Shipment created successfully:', shipment)
      toast.success('Shipment created successfully!')
      
      // Refresh quotes list
      await refetch()
    } catch (error) {
      console.error('Error creating shipment:', error)
      toast.error('An error occurred while creating the shipment.')
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-yellow-100 text-yellow-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'resolved':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
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
              <Card key={quote.id} className="p-6">
                <div className="grid grid-cols-3 gap-6">
                  {/* Quote Details */}
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <h3 className="font-medium">Quote Request #{quote.id.slice(0, 8)}</h3>
                      <Badge className={getStatusBadgeColor(quote.status)}>
                        {quote.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Package className="w-4 h-4" />
                        <span>{quote.metadata.packageDetails.type.replace(/_/g, ' ').toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{quote.metadata.destination.from} → {quote.metadata.destination.to}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Pickup: {formatDate(quote.metadata.destination.pickupDate)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div>
                    <h4 className="font-medium mb-2">Customer</h4>
                    <div className="space-y-1 text-sm">
                      <p>{quote.customer.name}</p>
                      <p className="text-gray-600">{quote.customer.email}</p>
                      <p className="text-gray-600">
                        Requested on {format(new Date(quote.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>

                  {/* Quote Form */}
                  <div>
                    <h4 className="font-medium mb-2">Submit Quote</h4>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        const form = e.target as HTMLFormElement
                        const price = parseFloat(form.price.value)
                        if (price > 0) {
                          handleSubmitQuote(quote.id, price)
                          form.reset()
                        }
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <Label htmlFor={`price-${quote.id}`}>Price (USD)</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                          <Input
                            id={`price-${quote.id}`}
                            name="price"
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            className="pl-8"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full">
                        Submit Quote
                      </Button>
                    </form>
                  </div>
                </div>

                {/* Additional Details */}
                {quote.metadata.packageDetails.specialRequirements && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium mb-2">Special Requirements</h4>
                    <p className="text-sm text-gray-600">
                      {quote.metadata.packageDetails.specialRequirements}
                    </p>
                  </div>
                )}
              </Card>
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
              <Card key={quote.id} className="p-6">
                <div className="grid grid-cols-3 gap-6">
                  {/* Quote Details */}
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <h3 className="font-medium">Quote Request #{quote.id.slice(0, 8)}</h3>
                      <Badge className={getStatusBadgeColor(quote.status)}>
                        {quote.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Package className="w-4 h-4" />
                        <span>{quote.metadata.packageDetails.type.replace(/_/g, ' ').toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{quote.metadata.destination.from} → {quote.metadata.destination.to}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Pickup: {formatDate(quote.metadata.destination.pickupDate)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <DollarSign className="w-4 h-4" />
                        <span>Quoted Price: ${quote.metadata.quotedPrice}</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleCreateShipment(quote.id)}
                      className="w-full mt-4 bg-green-600 hover:bg-green-700"
                    >
                      <Truck className="w-4 h-4 mr-2" />
                      Create Shipment
                    </Button>
                  </div>

                  {/* Customer Info */}
                  <div>
                    <h4 className="font-medium mb-2">Customer</h4>
                    <div className="space-y-1 text-sm">
                      <p>{quote.customer.name}</p>
                      <p className="text-gray-600">{quote.customer.email}</p>
                      <p className="text-gray-600">
                        Requested on {format(new Date(quote.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>

                  {/* Package Details */}
                  <div>
                    <h4 className="font-medium mb-2">Package Details</h4>
                    <div className="space-y-1 text-sm">
                      <p>Weight: {quote.metadata.packageDetails.weight} metric tons</p>
                      <p>Volume: {quote.metadata.packageDetails.volume} m³</p>
                      {quote.metadata.packageDetails.containerSize && (
                        <p>Container: {quote.metadata.packageDetails.containerSize}</p>
                      )}
                      {quote.metadata.packageDetails.palletCount && (
                        <p>Pallets: {quote.metadata.packageDetails.palletCount}</p>
                      )}
                      <p>Hazardous: {quote.metadata.packageDetails.hazardous ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                {quote.metadata.packageDetails.specialRequirements && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium mb-2">Special Requirements</h4>
                    <p className="text-sm text-gray-600">
                      {quote.metadata.packageDetails.specialRequirements}
                    </p>
                  </div>
                )}
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
} 