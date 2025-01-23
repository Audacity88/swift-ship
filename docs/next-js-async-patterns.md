# Next.js 15 Async Patterns Guide

## Overview

Next.js 15 introduces significant changes to how dynamic APIs and route parameters are handled, making previously synchronous operations asynchronous. This guide outlines the patterns and best practices for handling these changes in our application.

## Key Changes

### 1. Dynamic APIs
The following APIs are now asynchronous in Next.js 15:
- `cookies()`
- `headers()`
- `draftMode()`
- Route parameters (`params`)
- Search parameters (`searchParams`)

### 2. Route Parameters
Route parameters in dynamic routes (e.g., `[id]`) must now be handled as Promises:

```typescript
// Before (Next.js 14)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const ticketId = params.id
  // ...
}

// After (Next.js 15)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  // ...
}
```

## Best Practices

### 1. Cookie Handling

```typescript
// Recommended pattern for Supabase SSR
const createClient = async () => {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.delete({ name, ...options })
        },
      },
    }
  )
}
```

### 2. Route Parameter Access

```typescript
// Recommended pattern for route handlers
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Get the session first
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Then get the params
    const { id } = await context.params

    // 3. Use the ID in database queries
    const { data, error } = await supabase
      .from('your_table')
      .select('*')
      .eq('id', id)
      .single()

    // ... rest of the handler
  } catch (error) {
    console.error('Error in GET handler:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### 3. Error Handling

```typescript
// Recommended error handling pattern
try {
  // 1. Auth check
  const session = await auth()
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // 2. Parameter validation
  const { id } = await context.params
  if (!id) {
    return NextResponse.json(
      { error: 'Invalid ID' },
      { status: 400 }
    )
  }

  // 3. Database operations
  const { data, error: dbError } = await supabase
    .from('your_table')
    .select('*')
    .eq('id', id)
    .single()

  if (dbError) {
    console.error('Database error:', dbError)
    return NextResponse.json(
      { error: 'Database operation failed' },
      { status: 500 }
    )
  }

  // 4. Success response
  return NextResponse.json(data)
} catch (error) {
  // 5. Unexpected errors
  console.error('Unexpected error:', error)
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
```

## Type Safety

### 1. Route Context Types

```typescript
// Define explicit types for route contexts
type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  // ...
}
```

### 2. Response Types

```typescript
// Define explicit response types
interface ApiResponse<T> {
  data?: T
  error?: string
  status?: number
}

// Use in route handlers
const response: ApiResponse<YourDataType> = {
  data: result,
  status: 200
}
```

## Common Patterns

### 1. Authentication Flow

```typescript
// Recommended auth pattern
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    // ... rest of handler
  } catch (error) {
    // ... error handling
  }
}
```

### 2. Data Validation

```typescript
// Use Zod for request validation
const updateSchema = z.object({
  title: z.string().min(1).max(255),
  status: z.enum(['OPEN', 'CLOSED']),
  // ...
})

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const body = await request.json()
    const validated = updateSchema.parse(body)
    // ... use validated data
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    // ... other error handling
  }
}
```

## Performance Considerations

1. **Avoid Double Awaits**: Don't await the same Promise multiple times
2. **Parallel Promises**: Use `Promise.all()` when fetching multiple independent resources
3. **Error Boundaries**: Implement proper error boundaries in React components
4. **Type Safety**: Use TypeScript and Zod for runtime type safety

## Migration Guide

1. Run the Next.js codemod:
```bash
npx @next/codemod@latest next-async-request-api .
```

2. Update route parameter types to use Promise
3. Add proper error handling for async operations
4. Test all routes with authentication and validation
5. Monitor performance and error rates

## Common Issues and Solutions

1. **Cookie Handling**:
   - Issue: Cookies not available immediately
   - Solution: Always await cookies() before use

2. **Route Parameters**:
   - Issue: Cannot access params directly
   - Solution: Await context.params before use

3. **Type Errors**:
   - Issue: TypeScript errors with Promise types
   - Solution: Use correct Promise types and await properly

4. **Performance**:
   - Issue: Multiple awaits causing waterfall
   - Solution: Use Promise.all for parallel operations 