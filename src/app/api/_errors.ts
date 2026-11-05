// Route handlers catch unknown values; retain useful error messages/statuses
// only after checking their shape.
export function errorMessage(error: unknown, fallback: string): string {
  return error !== null && typeof error === 'object' && 'message' in error
    && typeof error.message === 'string' && error.message ? error.message : fallback
}

export function errorStatus(error: unknown): number {
  return error !== null && typeof error === 'object' && 'status' in error
    && typeof error.status === 'number' && Number.isInteger(error.status)
    && error.status >= 400 && error.status <= 599 ? error.status : 500
}
