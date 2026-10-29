import { render, fireEvent, screen, waitFor } from '@testing-library/react'
import { CreateTicketForm } from '@/components/features/tickets/CreateTicketForm'
import { createTicket } from '@/lib/services'

const toast = jest.fn()
jest.mock('@/lib/services', () => ({ createTicket: jest.fn(), TicketPriority: { LOW: 'low', MEDIUM: 'medium', HIGH: 'high', URGENT: 'urgent' } }))
jest.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast }) }))
jest.mock('@/components/features/customers/CustomerSearch', () => ({ CustomerSearch: ({ value, onChange }: any) => <input aria-label="Customer" value={value} onChange={event => onChange(event.target.value)} /> }))
jest.mock('@/components/features/tags/TagSelect', () => ({ TagSelect: () => null }))

it('passes cleaned ticket data as payload after the browser context argument', async () => {
  const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {})
  render(<CreateTicketForm />)
  fireEvent.change(screen.getByPlaceholderText('Enter ticket title'), { target: { value: '  Need help  ' } })
  fireEvent.change(screen.getByPlaceholderText('Enter ticket description'), { target: { value: '  Details  ' } })
  fireEvent.change(screen.getByLabelText('Customer'), { target: { value: 'customer' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create Ticket' }))
  await waitFor(() => expect(createTicket).toHaveBeenCalledWith(undefined, expect.objectContaining({ title: 'Need help', description: 'Details', customerId: 'customer', priority: 'medium' })))
  errorLog.mockRestore()
})
