import { PostgrestError } from '@supabase/supabase-js'

// Types for database operations
export type DbResult<T> = T extends PromiseLike<infer U> ? U : never
export type DbResultOk<T> = T extends PromiseLike<{ data: infer U }> ? Exclude<U, null> : never
export type DbResultErr = PostgrestError

// SQL value types
export type SqlValue = string | number | boolean | Date | null | { __dangerous__rawValue: string }

// SQL template literal tag
export function sql(strings: TemplateStringsArray, ...values: SqlValue[]) {
  return {
    strings,
    values,
    text: strings.reduce((prev, curr, i) => prev + '$' + i + curr)
  }
}

// Add dangerous raw value utility
sql.__dangerous__rawValue = (value: string) => ({
  __dangerous__rawValue: value,
  toString: () => value
})

// Transaction helper
export interface Transaction {
  execute: <T>(query: ReturnType<typeof sql>) => Promise<T[]>
}

sql.join = (queries: ReturnType<typeof sql>[], separator: string) => {
  const result = {
    strings: [] as string[],
    values: [] as SqlValue[],
    text: ''
  }

  queries.forEach((query, i) => {
    result.strings.push(...query.strings)
    result.values.push(...query.values)
    if (i < queries.length - 1) {
      result.strings[result.strings.length - 1] += separator
    }
  })

  return result
}

// Execute a query
sql.execute = async <T = any>(query: ReturnType<typeof sql>): Promise<T[]> => {
  const { data, error } = await db
    .from('raw_query')
    .select('*')
    .eq('query', query.text)
    .eq('values', query.values)

  if (error) throw error
  return data as T[]
}

// Execute a transaction
sql.transaction = async <T = any>(
  callback: (tx: Transaction) => Promise<T>
): Promise<T> => {
  const tx: Transaction = {
    execute: async <U = any>(query: ReturnType<typeof sql>): Promise<U[]> => {
      const { data, error } = await db
        .from('raw_query')
        .select('*')
        .eq('query', query.text)
        .eq('values', query.values)

      if (error) throw error
      return data as U[]
    }
  }

  return callback(tx)
} 