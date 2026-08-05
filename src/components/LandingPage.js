'use client'

import { supabase } from '@/lib/supabase'

export default function LandingPage() {
  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="-mt-16 md:-mt-14 min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between">
      {/* Top Bar / Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-blue-600 dark:text-blue-400">
            <span>✨ Momentia</span>
          </div>
          <button
            onClick={handleGoogleSignIn}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-xl transition shadow-md hover:shadow-lg"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 py-16 flex-1 flex flex-col justify-center items-center text-center">
        <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/50 rounded-full mb-6">
          AI-Powered Study Platform
        </span>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-3xl leading-tight mb-6">
          Master Any Subject with Smart Roadmaps & AI Guidance
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mb-8 leading-relaxed">
          Upload your course materials or enter a subject name. Momentia generates structured study roadmaps, schedules your timetable, and connects you with study partners.
        </p>

        {/* Call to Action Button */}
        <button
          onClick={handleGoogleSignIn}
          className="flex items-center gap-3 px-8 py-4 text-base font-bold bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-2xl transition shadow-xl hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Get Started with Google
        </button>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-20 text-left w-full">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <div className="text-2xl mb-3">🗺️</div>
            <h3 className="font-bold text-base mb-1">AI Roadmaps</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Transform syllabus documents into structured, unit-by-unit learning paths automatically.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <div className="text-2xl mb-3">📅</div>
            <h3 className="font-bold text-base mb-1">Smart Timetable</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Automated session scheduling using earliest-deadline-first algorithms to ace exams.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <div className="text-2xl mb-3">⏱️</div>
            <h3 className="font-bold text-base mb-1">Interactive Study</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Track focus sessions with embedded timers and instant AI topic summaries.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <div className="text-2xl mb-3">💬</div>
            <h3 className="font-bold text-base mb-1">Social & Chat</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Connect with classmates, share study progress, and chat in real time.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        © {new Date().getFullYear()} Momentia. Built for smart learning.
      </footer>
    </div>
  )
}