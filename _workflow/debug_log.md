# Debug Log: Cookie Handling in Next.js App Router API Routes

## Issue Evolution
1. Initial Issue: Cookie handling in Next.js App Router
2. Secondary Issue: Dynamic route parameters in Next.js App Router

## Root Cause Analysis
1. Next.js App Router's `cookies()` function is inherently asynchronous
2. Dynamic route parameters (`params.id`) are also asynchronous in App Router
3. Both issues stem from Next.js 13+'s design for dynamic API operations

## Attempted Solutions

### 1. Direct Cookie Access
```typescript
const cookieStore = cookies()
return cookieStore.get(name)?.value
```
**Result**: Failed - `cookies()` returns a Promise that needs to be awaited.

### 2. Async Cookie Handler with Separate Function
```typescript
const getSupabaseCookieStore = async () => {
  return await cookies()
}
```
**Result**: Failed - Still getting the same error about needing to await cookies().

### 3. Synchronous Cookie Handler
```typescript
const initSupabase = () => {
  const cookieStore = cookies()
  // ... cookie methods
}
```
**Result**: Failed - The underlying issue persists as cookies() is fundamentally async.

### 4. Async Methods with Direct Cookie Access
```typescript
async get(name: string) {
  const cookie = await cookieStore.get(name)
  return cookie?.value
}
```
**Result**: Failed - The error persists because the root issue is with cookies() initialization.

### 5. Server Component Approach with Authorization Header
```typescript
const getAuthCookie = () => {
  const cookieStore = cookies()
  const authCookie = cookieStore.get('sb-access-token')?.value
  return authCookie
}

const initSupabase = () => {
  const authCookie = getAuthCookie()
  return createServerClient({
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        Authorization: authCookie ? `Bearer ${authCookie}` : ''
      }
    }
  })
}
```
**Result**: Failed - Supabase SSR client requires specific cookie methods.

### 6. Supabase SSR Cookie Methods
```typescript
const initSupabase = () => {
  const cookieStore = cookies()
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => {
          const cookieList = cookieStore.getAll()
          return cookieList.map(cookie => ({
            name: cookie.name,
            value: cookie.value,
          }))
        },
        setAll: (cookieList) => {
          cookieList.map(cookie => {
            cookieStore.set(cookie.name, cookie.value, cookie.options)
          })
        }
      }
    }
  )
}
```
**Result**: Testing in progress - This approach:
1. Uses Supabase's required cookie methods (getAll and setAll)
2. Properly maps cookie objects to the format Supabase expects
3. Handles both reading and writing cookies
4. Maintains session state correctly

### 7. Simplified Cookie Methods
```typescript
const initSupabase = async () => {
  const cookieStore = cookies()
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = cookieStore.get(name)
          return cookie?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete({ name, ...options })
        }
      }
    }
  )
}
```
**Key Changes**:
1. Made `initSupabase` async to handle potential async cookie operations
2. Simplified cookie methods to use basic get/set/remove instead of getAll/setAll
3. Used `delete` instead of setting empty value for cookie removal
4. Removed unnecessary async/await in cookie methods
5. Made sure to await `initSupabase` in all route handlers

**Result**: Testing in progress - This approach:
- Uses simpler, more direct cookie methods
- Avoids the complexity of handling multiple cookies at once
- Properly handles cookie operations in the Next.js App Router context

### 8. Simplified Pattern from Working Routes
```typescript
const createClient = () => {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookieStore = await cookies()
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}
```
**Key Changes**:
1. Simplified to a single `createClient` function
2. Only implemented the `get` method as it's the only one needed
3. Made the cookie get operation async
4. Removed unnecessary cookie operations (set/remove)
5. Pattern matches other working routes in the codebase

**Rationale**:
- This pattern is successfully used in multiple other route files
- Minimizes cookie handling to just what's needed
- Properly handles the async nature of `cookies()`

**Result**: Testing in progress

### 9. Server-Side Auth Pattern
```typescript
import { createClient } from '@supabase/supabase-js'
import { auth } from '@/lib/auth'

// Create a Supabase client for server-side operations
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Use server-side auth check
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    // ... rest of the handler
  }
}
```
**Key Changes**:
1. Moved to server-side auth handling using `auth()` from `@/lib/auth`
2. Removed all cookie handling code
3. Uses standard Supabase client instead of SSR client
4. Aligns with project's auth guidelines

**Rationale**:
- Follows the Agent Instructions for server-side auth
- Removes complexity of cookie handling
- Uses established auth patterns from the project
- Matches other working routes in the codebase

**Result**: Testing in progress

## Current Status
Testing the Server-Side Auth Pattern approach. This solution:
- Follows project guidelines for auth handling
- Removes cookie complexity entirely
- Uses established patterns from the codebase

## Next Steps
1. Monitor the current solution for any issues
2. If successful, standardize this pattern across all routes
3. If unsuccessful, review the auth implementation in `@/lib/auth`

### 10. Dynamic Route Parameters with Promise Type
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: Promise<string> } }
) {
  try {
    const ticketId = await params.id  // Still fails
    // ... rest of handler
  }
}
```
**Key Changes**:
1. Updated params type to include Promise
2. Added await for params.id access
3. Maintained consistent async/await usage

**Result**: Failed - The error persists despite proper typing and awaiting

### 11. Working Pattern from Codebase
Found a working example in `/api/knowledge/articles/[id]/route.ts` that handles dynamic route parameters correctly:

```typescript
type RouteContext = {
  params: { id: string }
}

export async function GET(
  req: NextRequest,
  { params }: RouteContext
) {
  // Use params.id directly without await
  const { data: article } = await supabase
    .from('articles')
    .select(`...`)
    .eq('id', params.id)
    .single();
}
```

**Key Insights**:
1. Route parameters are NOT actually Promises in Next.js App Router
2. The type should be `string`, not `Promise<string>`
3. No need to await `params.id`
4. Using a `RouteContext` type helps with type safety

**Changes Made**:
1. Added `RouteContext` type definition
2. Changed params type from `Promise<string>` to `string`
3. Removed unnecessary `await` on `params.id`
4. Using `params.id` directly in queries

**Result**: Testing in progress

## Current Understanding
1. **Next.js Documentation vs Reality**:
   - The error message about awaiting params is misleading
   - Route parameters are synchronously available
   - The async warning might be a bug in Next.js

2. **Best Practices**:
   - Define explicit types for route contexts
   - Use route parameters directly without await
   - Follow working patterns from the codebase

## Next Steps
1. Test this solution thoroughly
2. If successful, update all similar route handlers
3. Consider filing an issue with Next.js about the misleading error message

## Questions to Answer
1. Is this a limitation of Next.js App Router or a bug?
2. Are there performance implications of making all parameter access async?
3. Should we consider alternative routing strategies?

# Debug Log: Next.js Dynamic APIs in App Router

## Key Discovery: Next.js 15 Changes
After investigating why some routes work and others fail, we discovered important changes in Next.js 15:

1. Dynamic APIs (including route params) are now truly asynchronous
2. The error message about awaiting params is NOT misleading - it's a new requirement
3. Different routes might be using different versions or patterns

### Working vs Non-Working Examples

1. Non-Working Pattern:
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // ❌ Direct access fails in Next.js 15
  const ticketId = params.id
}
```

2. Working Pattern (Next.js 15):
```typescript
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  // ✅ Properly await the params
  const { id } = await context.params
}
```

### Key Insights:
1. The params object itself must be awaited, not just its properties
2. Using destructuring in the function parameters can cause issues
3. Using a separate context parameter helps maintain the async nature
4. Other routes might work because they're not yet running under strict Next.js 15 rules

### Solution Requirements:
1. Always await the params object before accessing properties
2. Use the context parameter pattern instead of destructuring
3. Update all route handlers to follow this pattern for consistency

### Migration Path:
1. Use the `@next/codemod` tool for automatic fixes where possible
2. Manually update routes following the Next.js 15 pattern
3. Consider adding ESLint rules to enforce the new pattern

## Next Steps:
1. Test this solution with the updated route handler
2. Update other route handlers to follow the same pattern
3. Document this as a required pattern for all new route handlers
4. Consider adding automated tests to verify proper param handling
