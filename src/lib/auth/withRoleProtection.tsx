import { ComponentType, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export const withRoleProtection = (
  Component: ComponentType,
  allowedRoles: string[],
  requiredPermissions?: string[]
) => {
  const WrappedComponent = (props: any) => {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
      const checkAuth = async () => {
        try {
          const { data: { session }, error } = await supabase.auth.getSession()

          if (error) {
            router.replace('/auth/signin')
            return
          }

          if (!session) {
            router.replace('/auth/signin')
            return
          }

          const userRole = session.user.user_metadata.role

          if (!userRole || !allowedRoles.includes(userRole)) {
            router.replace('/unauthorized')
            return
          }

          setLoading(false)
        } catch (err) {
          router.replace('/auth/signin')
        }
      }

      checkAuth()
    }, [router])

    if (loading) {
      return <div>Loading...</div>
    }

    return <Component {...props} />
  }

  return WrappedComponent
} 