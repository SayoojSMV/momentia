'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
      } else {
        setUser(session.user)
      }
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace('/login')
      } else {
        setUser(session.user)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) return null

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-2">
          Hi {user?.user_metadata?.full_name || user?.email}
        </h1>
        <p className="text-gray-500 mb-6">Welcome to Momentia</p>
        <button
          onClick={handleSignOut}
          className="border rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Sign out
        </button>
      </div>
    </main>
  )
}