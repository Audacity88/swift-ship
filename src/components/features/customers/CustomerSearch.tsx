'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useQuery } from '@tanstack/react-query'
import type { Customer } from '@/types/ticket'
import { getServerSupabase } from '@/lib/supabase-client'

interface CustomerSearchProps {
  value: string
  onChange: (value: string) => void
}

export const CustomerSearch = ({
  value,
  onChange
}: CustomerSearchProps) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data: customers, isLoading, error } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const supabase = getServerSupabase()
      const response = await fetch('/api/customers', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      })
      if (!response.ok) {
        throw new Error('Failed to fetch customers')
      }
      const data = await response.json()
      console.log('Fetched customers:', data) // Debug log
      return data
    }
  })

  const selectedCustomer = customers?.find((customer: Customer) => customer.id === value)
  const filteredCustomers = customers?.filter((customer: Customer) => 
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    customer.email.toLowerCase().includes(search.toLowerCase()) ||
    (customer.company && customer.company.toLowerCase().includes(search.toLowerCase()))
  )

  const handleSelect = (customerId: string) => {
    console.log('Selected customer ID:', customerId) // Debug log
    onChange(customerId)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value
            ? selectedCustomer?.name
            : "Select customer..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput 
            placeholder="Search customers..." 
            value={search}
            onValueChange={setSearch}
          />
          {isLoading ? (
            <div className="py-6 text-center">
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">Loading customers...</p>
            </div>
          ) : error ? (
            <CommandEmpty>Failed to load customers.</CommandEmpty>
          ) : filteredCustomers?.length === 0 ? (
            <CommandEmpty>No customer found.</CommandEmpty>
          ) : (
            <CommandGroup>
              {filteredCustomers?.map((customer: Customer) => (
                <CommandItem
                  key={customer.id}
                  value={customer.id}
                  onSelect={() => handleSelect(customer.id)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === customer.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{customer.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {customer.email}
                      {customer.company && ` • ${customer.company}`}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
} 