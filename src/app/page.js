'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const motivationalQuotes = [
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Small steps every day lead to big results.", author: "Unknown" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
]

export default function Dashboard() {
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
  }, [router])

  if (loading) return null

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
  const quote = motivationalQuotes[dayOfYear % motivationalQuotes.length]

  const placeholderStats = {
    status: 'On track',
    streak: 4,
    completion: 62,
    timeSpent: '11h 20m',
  }

  const placeholderSubjects = [
    { id: 1, name: 'Organic Chemistry', category: 'academics', completion: 70 },
    { id: 2, name: 'Linear Algebra', category: 'academics', completion: 45 },
    { id: 3, name: 'Guitar Theory', category: 'side_quest', completion: 20 },
  ]

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">
          Hi {user?.user_metadata?.full_name?.split(' ')[0] || 'there'}
        </h1>
        <p className="text-gray-500 italic mt-1">
          "{quote.text}" — {quote.author}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatTile label="Status" value={placeholderStats.status} />
        <StatTile label="Current streak" value={`${placeholderStats.streak} days`} />
        <StatTile label="Overall completion" value={`${placeholderStats.completion}%`} />
        <StatTile label="Time spent" value={placeholderStats.timeSpent} />
      </div>

      <div className="border rounded-lg p-4 mb-8 bg-white">
        <p className="text-sm font-medium text-gray-700">Today</p>
        <p className="text-gray-400 text-sm mt-1">Timetable not generated yet</p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Subjects</h2>
        <button className="bg-black text-white text-sm px-4 py-2 rounded-md hover:bg-gray-800">
          + Add subject
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {placeholderSubjects.map((subject) => (
          <SubjectCard key={subject.id} subject={subject} />
        ))}
      </div>
    </main>
  )
}

function StatTile({ label, value }) {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
    </div>
  )
}

function SubjectCard({ subject }) {
  return (
    <div className="border rounded-lg p-4 bg-white hover:shadow-sm cursor-pointer transition">
      <p className="text-xs text-gray-400 uppercase">{subject.category.replace('_', ' ')}</p>
      <p className="font-medium mt-1">{subject.name}</p>
      <div className="w-full bg-gray-100 rounded-full h-2 mt-3">
        <div
          className="bg-black h-2 rounded-full"
          style={{ width: `${subject.completion}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1">{subject.completion}% complete</p>
    </div>
  )
}