'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(() => {
      router.replace('/')
    })
  }, [router])

  return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Signing you in...</p>
    </main>
  )
}