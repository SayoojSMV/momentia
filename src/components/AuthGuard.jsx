'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Pages anyone can access without being logged in
const PUBLIC_ROUTES = ['/login', '/auth/callback']

export default function AuthGuard({ children }) {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      const isPublicRoute = PUBLIC_ROUTES.includes(pathname)

      if (!session && !isPublicRoute) {
        // 🛑 Unauthorized user trying to access private page -> Redirect to /login
        router.replace('/login')
      } else if (session && pathname === '/login') {
        // 🔄 Logged-in user visiting /login -> Redirect to Dashboard
        router.replace('/')
      } else {
        // ✅ Authorized
        setAuthenticated(true)
      }
      setLoading(false)
    }

    checkAuth()

    // Listen for auth state changes (e.g., explicit Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [pathname, router])

  // Prevent showing protected UI while checking auth status
  if (loading && !PUBLIC_ROUTES.includes(pathname)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-gray-500">Checking authorization...</p>
      </div>
    )
  }

  return <>{children}</>
}