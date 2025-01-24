'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { format } from 'date-fns'
import { Package, MapPin, Calendar, DollarSign, Truck, Pencil, Trash2 } from 'lucide-react'
import type { QuoteRequest } from '@/types/quote'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface QuoteDetailViewProps {
  quote: QuoteRequest
  onSubmitQuote?: (quoteId: string, price: number) => Promise<void>
  onCreateShipment?: (quoteId: string) => Promise<void>
  onEditQuote?: (quote: QuoteRequest) => void
  onDeleteQuote?: (quoteId: string) => Promise<void>
  mode?: 'pending' | 'quoted'
  isAdmin?: boolean
  isDeleting?: boolean
}

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

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'open':
      return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100'
    case 'in_progress':
      return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100'
    case 'resolved':
      return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export function QuoteDetailView({ 
  quote, 
  onSubmitQuote, 
  onCreateShipment,
  onEditQuote,
  onDeleteQuote,
  mode = 'pending',
  isAdmin = false,
  isDeleting = false
}: QuoteDetailViewProps) {
  const [quotePrice, setQuotePrice] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmitQuote = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
    }
    
    if (!onSubmitQuote || !quotePrice) return
    
    try {
      setIsSubmitting(true)
      const price = parseFloat(quotePrice)
      if (isNaN(price) || price <= 0) {
        return
      }
      await onSubmitQuote(quote.id, price)
      setQuotePrice('')
    } catch (error) {
      console.error('Error submitting quote:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="p-6 relative">
      {/* Action Buttons - Show for admins or when edit/delete handlers are provided */}
      {(isAdmin || onEditQuote || onDeleteQuote) && (quote.status === 'open' || quote.status === 'in_progress') && (
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {quote.status === 'open' && onEditQuote && (
            <button
              onClick={() => onEditQuote(quote)}
              className={cn(
                "p-1 rounded-lg",
                "hover:bg-muted/50 transition-colors"
              )}
              title="Edit quote"
            >
              <Pencil className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          {onDeleteQuote && (
            <button
              onClick={() => onDeleteQuote(quote.id)}
              className={cn(
                "p-1 rounded-lg",
                "hover:bg-muted/50 transition-colors"
              )}
              title="Delete quote"
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </button>
          )}
        </div>
      )}

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
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="w-4 h-4" />
              <span>{quote.metadata.packageDetails.type.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{quote.metadata.destination.from.address} → {quote.metadata.destination.to.address}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Pickup: {formatDate(quote.metadata.destination.pickupDate)}</span>
            </div>
            {quote.metadata.estimatedDelivery && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Estimated Delivery: {formatDate(quote.metadata.estimatedDelivery)}</span>
              </div>
            )}
            {mode === 'quoted' && quote.metadata.quotedPrice && (
              <div className="flex items-center gap-2 text-sm font-medium">
                <DollarSign className="w-4 h-4" />
                <span>Quoted Price: ${quote.metadata.quotedPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            {mode === 'pending' && !quote.metadata.quotedPrice && quote.metadata.estimatedPrice && (
              <div className="mt-2 flex items-center gap-2 text-sm font-medium">
                <DollarSign className="w-4 h-4" />
                <span>Estimated Price: ${quote.metadata.estimatedPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>

          {mode === 'quoted' && onCreateShipment && (
            <Button
              onClick={() => onCreateShipment(quote.id)}
              className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white"
              variant="success"
            >
              <Truck className="w-4 h-4 mr-2" />
              Create Shipment
            </Button>
          )}
        </div>

        {/* Customer Info */}
        <div>
          <h4 className="font-medium mb-2">Customer</h4>
          <div className="space-y-1 text-sm">
            <p>{quote.customer.name}</p>
            <p className="text-muted-foreground">{quote.customer.email}</p>
            <p className="text-muted-foreground">
              Requested on {format(new Date(quote.created_at), 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        {mode === 'pending' && onSubmitQuote ? (
          /* Quote Form */
          <div>
            <h4 className="font-medium mb-2">Submit Quote</h4>
            <div className="space-y-4">
              <div>
                <Label htmlFor={`price-${quote.id}`}>Price (USD)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id={`price-${quote.id}`}
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="pl-8"
                    placeholder="0.00"
                    value={quotePrice}
                    onChange={(e) => setQuotePrice(e.target.value)}
                  />
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    type="button" 
                    className="w-full"
                    disabled={!quotePrice || isSubmitting}
                  >
                    Submit Quote
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Quote Submission</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to submit this quote for ${quotePrice}? 
                      This will notify the customer and cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleSubmitQuote}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Quote'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : (
          /* Package Details */
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
        )}
      </div>

      {/* Additional Details */}
      {quote.metadata.packageDetails.specialRequirements && (
        <div className={cn(
          "mt-4 pt-4",
          "border-t border-border"
        )}>
          <h4 className="font-medium mb-2">Special Requirements</h4>
          <p className="text-sm text-muted-foreground">
            {quote.metadata.packageDetails.specialRequirements}
          </p>
        </div>
      )}
    </Card>
  )
} 