'use client'

import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Navbar() {
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <nav className="border-b bg-white px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-semibold">Momentia</Link>
        <Link href="/timetable" className="text-sm text-gray-500 hover:text-gray-800">
          Timetable
        </Link>
        <Link href="/friends" className="text-sm text-gray-500 hover:text-gray-800">
          Friends
        </Link>
      </div>
      <button
        onClick={handleSignOut}
        className="text-sm text-gray-500 hover:text-gray-800"
      >
        Sign out
      </button>
    </nav>
  )
}