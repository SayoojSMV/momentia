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
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-2 dark:text-white">Momentia</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Sign in to continue</p>
        <button
          onClick={handleGoogleLogin}
          className="border dark:border-gray-600 rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300"
        >
          Continue with Google
        </button>
      </div>
    </main>
  )
}