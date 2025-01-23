import { PostgrestError, SupabaseClient } from '@supabase/supabase-js'

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
    text: strings.reduce((prev, curr, i) => {
      const value = values[i - 1]
      if (value && typeof value === 'object' && '__dangerous__rawValue' in value) {
        return prev + value.__dangerous__rawValue + curr
      }
      return prev + '$' + i + curr
    })
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
sql.execute = async <T = any>(query: ReturnType<typeof sql>, supabase: SupabaseClient): Promise<T[]> => {
  const { data, error } = await supabase
    .rpc('execute_sql', {
      query_text: query.text,
      query_params: query.values
    })

  if (error) {
    console.error('Database query error:', error)
    throw new Error('Failed to execute database query')
  }
  
  return data as T[]
}

// Execute a transaction
sql.transaction = async <T = any>(
  callback: (tx: Transaction) => Promise<T>,
  supabase: SupabaseClient
): Promise<T> => {
  const tx: Transaction = {
    execute: async <U = any>(query: ReturnType<typeof sql>): Promise<U[]> => {
      const { data, error } = await supabase
        .rpc('execute_sql', {
          query_text: query.text,
          query_params: query.values
        })

      if (error) {
        console.error('Database transaction error:', error)
        throw new Error('Failed to execute database transaction')
      }
      
      return data as U[]
    }
  }

  return callback(tx)
} 