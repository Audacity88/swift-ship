/** Labels for database status values shown in customer-facing screens. */
export function formatTicketStatus(status: string): string {
  const text = status.replace(/_/g, ' ').trim()
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Unknown'
}
