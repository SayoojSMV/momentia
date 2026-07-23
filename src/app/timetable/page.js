'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function TimetablePage() {
  const [user, setUser] = useState(null)
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [minutesPerDay, setMinutesPerDay] = useState(120)
  const [error, setError] = useState(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      setUser(session.user)
      fetchSchedule(session.user.id)
    })
  }, [router])

  const fetchSchedule = async (userId) => {
    const { data, error } = await supabase
      .from('schedule')
      .select(`*, topics(name, minutes, difficulty), subjects(name, category)`)
      .eq('user_id', userId)
      .order('scheduled_date', { ascending: true })
    if (!error) setSchedule(data)
    setLoading(false)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    const response = await fetch('/api/generate-timetable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, minutesPerDay }),
    })
    const result = await response.json()
    if (!response.ok || result.error) {
      setError(result.error || 'Something went wrong.')
      setGenerating(false)
      return
    }
    await fetchSchedule(user.id)
    setGenerating(false)
  }

  const groupedByDate = schedule.reduce((acc, session) => {
    const date = session.scheduled_date
    if (!acc[date]) acc[date] = []
    acc[date].push(session)
    return acc
  }, {})

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    if (date.getTime() === today.getTime()) return 'Today'
    if (date.getTime() === tomorrow.getTime()) return 'Tomorrow'
    return date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  if (loading) return null

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold dark:text-white">Timetable</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          AI-scheduled study sessions based on your subjects and deadlines
        </p>
      </div>

      {/* Generator controls */}
      <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-4 mb-6">
        <p className="text-sm font-medium mb-3 dark:text-white">Generate timetable</p>
        <div className="flex items-center gap-4 mb-3">
          <label className="text-sm text-gray-600 dark:text-gray-400">Daily study time</label>
          <select
            value={minutesPerDay}
            onChange={(e) => setMinutesPerDay(Number(e.target.value))}
            className="border dark:border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black bg-white dark:bg-gray-800 dark:text-white"
          >
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
            <option value={120}>2 hours</option>
            <option value={180}>3 hours</option>
            <option value={240}>4 hours</option>
            <option value={300}>5 hours</option>
          </select>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className={`w-full py-2 rounded-lg text-sm font-medium transition ${
            generating
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
              : 'bg-black text-white hover:bg-gray-800'
          }`}
        >
          {generating ? 'Generating...' : '✨ Generate timetable'}
        </button>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      {/* Schedule */}
      {Object.keys(groupedByDate).length === 0 ? (
        <p className="text-gray-400 dark:text-gray-500 text-sm">
          No schedule yet — generate one above.
        </p>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([date, sessions]) => (
            <div key={date}>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {formatDate(date)}
              </p>
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => router.push(`/subject/${session.subject_id}/topic/${session.topic_id}`)}
                    className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-lg px-4 py-3 flex items-center justify-between cursor-pointer hover:shadow-sm dark:hover:bg-gray-800 transition"
                  >
                    <div>
                      <p className="text-sm font-medium dark:text-white">
                        {session.topics?.name}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {session.subjects?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {session.topics?.minutes} min
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                        {session.topics?.difficulty}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}