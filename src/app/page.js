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
  const [subjects, setSubjects] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [newSubject, setNewSubject] = useState({ name: '', category: 'academics', exam_date: '' })
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
        return
      }
      setUser(session.user)
      setLoading(false)

      supabase
        .from('subjects')
        .select('*')
        .order('created_at', { ascending: true })
        .then(({ data, error }) => {
          if (!error) setSubjects(data)
        })
    })
  }, [router])

  const handleAddSubject = async () => {
    if (!newSubject.name.trim()) return

    const { data, error } = await supabase
      .from('subjects')
      .insert({
        user_id: user.id,
        name: newSubject.name.trim(),
        category: newSubject.category,
        exam_date: newSubject.exam_date || null,
      })
      .select()
      .single()

    if (!error) {
      setSubjects((prev) => [...prev, data])
      setNewSubject({ name: '', category: 'academics', exam_date: '' })
      setShowModal(false)
    }
  }

  if (loading) return null

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
  const quote = motivationalQuotes[dayOfYear % motivationalQuotes.length]

  const placeholderStats = {
    status: 'On track',
    streak: 4,
    completion: 62,
    timeSpent: '11h 20m',
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      {/* Greeting banner */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">
          Hi {user?.user_metadata?.full_name?.split(' ')[0] || 'there'}
        </h1>
        <p className="text-gray-500 italic mt-1">
          "{quote.text}" — {quote.author}
        </p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatTile label="Status" value={placeholderStats.status} />
        <StatTile label="Current streak" value={`${placeholderStats.streak} days`} />
        <StatTile label="Overall completion" value={`${placeholderStats.completion}%`} />
        <StatTile label="Time spent" value={placeholderStats.timeSpent} />
      </div>

      {/* Today panel */}
      <div className="border rounded-lg p-4 mb-8 bg-white">
        <p className="text-sm font-medium text-gray-700">Today</p>
        <p className="text-gray-400 text-sm mt-1">Timetable not generated yet</p>
      </div>

      {/* Subjects */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Subjects</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-black text-white text-sm px-4 py-2 rounded-md hover:bg-gray-800"
        >
          + Add subject
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.length === 0 ? (
          <p className="text-gray-400 text-sm">
            No subjects yet — add one to get started.
          </p>
        ) : (
          subjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} />
          ))
        )}
      </div>

      {/* Add subject modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Add subject</h2>

            <div className="mb-3">
              <label className="text-sm text-gray-600 block mb-1">Subject name</label>
              <input
                type="text"
                value={newSubject.name}
                onChange={(e) => setNewSubject((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Organic Chemistry"
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>

            <div className="mb-3">
              <label className="text-sm text-gray-600 block mb-1">Category</label>
              <select
                value={newSubject.category}
                onChange={(e) => setNewSubject((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
              >
                <option value="academics">Academics</option>
                <option value="side_quest">Side Quest</option>
                <option value="test_prep">Test Prep</option>
              </select>
            </div>

            <div className="mb-5">
              <label className="text-sm text-gray-600 block mb-1">
                Exam date <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="date"
                value={newSubject.exam_date}
                onChange={(e) => setNewSubject((prev) => ({ ...prev, exam_date: e.target.value }))}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm rounded-md border hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSubject}
                className="px-4 py-2 text-sm rounded-md bg-black text-white hover:bg-gray-800"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
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
          style={{ width: '0%' }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1">0% complete</p>
    </div>
  )
}