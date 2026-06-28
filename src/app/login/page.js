'use client'

import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-2">Momentia</h1>
        <p className="text-gray-500 mb-6">Sign in to continue</p>
        <button
          onClick={handleGoogleLogin}
          className="border rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Continue with Google
        </button>
      </div>
    </main>
  )
}