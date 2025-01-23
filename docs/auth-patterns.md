# Authentication Patterns Guide

This guide outlines the standard authentication patterns to use across different parts of the application.

## Server-Side Authentication

### API Routes
```typescript
import { getServerSupabase } from '@/lib/supabase-client'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = getServerSupabase()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Continue with authenticated logic...
}
```

### Server Components
```typescript
import { getServerSupabase } from '@/lib/supabase-client'

export default async function ServerComponent() {
  const supabase = getServerSupabase()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    // Handle unauthorized state
    return null
  }
  
  // Continue with authenticated logic...
}
```

## Client-Side Authentication

### Client Components
```typescript
import { useAuth } from '@/lib/hooks/useAuth'

export default function ClientComponent() {
  const { user } = useAuth()
  
  if (!user) {
    return <div>Please sign in</div>
  }
  
  // Continue with authenticated logic...
}
```

### Auth Pages
For pages that handle authentication flows (sign in, sign up, password reset, etc.), continue using `createBrowserClient`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export default function AuthPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  // Handle auth flows...
}
```

## Middleware Authentication

For middleware authentication, continue using `createServerClient`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function middleware(request: Request) {
  const cookieStore = cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
  
  // Handle middleware auth logic...
}
```

## Best Practices

1. **Server Components/Routes**
   - Always use `getServerSupabase()` for server-side operations
   - Check for both `userError` and `!user` when verifying auth
   - Return appropriate error responses (401 for unauthorized, 403 for forbidden)

2. **Client Components**
   - Use the `useAuth` hook for accessing user state
   - Handle loading and error states appropriately
   - Avoid storing sensitive user data in client state

3. **Auth Pages**
   - Keep using `createBrowserClient` for auth operations
   - Handle all error cases and provide user feedback
   - Implement proper redirects after auth operations

4. **Middleware**
   - Keep using `createServerClient` with proper cookie handling
   - Implement auth checks based on route patterns
   - Handle public routes appropriately

## Error Handling

Always handle these common error cases:

```typescript
// Unauthorized (not logged in)
if (userError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// Forbidden (logged in but insufficient permissions)
if (!hasRequiredRole) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// Server Error
if (error) {
  return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
}
```

## Migration Guide

When migrating from `getSession()` to `getUser()`:

1. Replace imports:
   ```typescript
   // Old
   import { getSession } from '@supabase/auth-helpers-nextjs'
   
   // New
   import { getServerSupabase } from '@/lib/supabase-client'
   ```

2. Replace auth checks:
   ```typescript
   // Old
   const { data: { session } } = await supabase.auth.getSession()
   if (!session) {
     return unauthorized()
   }
   
   // New
   const { data: { user }, error: userError } = await supabase.auth.getUser()
   if (userError || !user) {
     return unauthorized()
   }
   ```

3. Update user references:
   ```typescript
   // Old
   const userId = session.user.id
   
   // New
   const userId = user.id
   ```
