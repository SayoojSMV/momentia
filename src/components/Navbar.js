'use client'

import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <nav className="border-b bg-white px-6 py-3 flex items-center justify-between">
      <span className="font-semibold">Momentia</span>
      <button
        onClick={handleSignOut}
        className="text-sm text-gray-500 hover:text-gray-800"
      >
        Sign out
      </button>
    </nav>
  )
}