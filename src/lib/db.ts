import type { PostgrestError } from '@supabase/supabase-js'

// Use Supabase's query builder or a dedicated, permission-checked RPC.
// Arbitrary SQL execution is deliberately unavailable to application callers.
export type DbResult<T> = T extends PromiseLike<infer U> ? U : never
export type DbResultOk<T> = T extends PromiseLike<{ data: infer U }> ? Exclude<U, null> : never
export type DbResultErr = PostgrestError
