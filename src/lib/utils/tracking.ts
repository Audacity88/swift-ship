/**
 * Generates a unique tracking number for shipments
 * Format: SSE-YEAR-RANDOMNUMBER
 * Example: SSE-2024-1234567
 */
export function generateTrackingNumber(): string {
  const prefix = 'SSE' // Swift Ship Express
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 10000000).toString().padStart(7, '0')
  return `${prefix}-${year}-${random}`
} 