'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

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
  const [todaySessions, setTodaySessions] = useState([])
  const [stats, setStats] = useState({
    status: 'On track',
    streak: 0,
    completion: 0,
    timeSpent: '0 min',
  })
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
        return
      }
      setUser(session.user)
      setLoading(false)

      // Fetch subjects
      supabase
        .from('subjects')
        .select('*')
        .order('created_at', { ascending: true })
        .then(({ data, error }) => {
          if (!error) setSubjects(data)
        })

      // Fetch today's schedule
      const todayStr = new Date().toISOString().split('T')[0]
      supabase
        .from('schedule')
        .select(`
          *,
          topics(name, minutes),
          subjects(name)
        `)
        .eq('user_id', session.user.id)
        .eq('scheduled_date', todayStr)
        .then(({ data, error }) => {
          if (!error) setTodaySessions(data)
        })

      // Fetch profile for streak
      supabase
        .from('profiles')
        .select('current_streak')
        .eq('id', session.user.id)
        .single()
        .then(({ data: profile }) => {
          // Fetch all topics for completion + time spent
          supabase
            .from('topics')
            .select('status, time_spent_seconds, units(subjects(user_id))')
            .then(({ data: topics }) => {
              if (!topics) return

              // Filter to only this user's topics
              const myTopics = topics.filter(
                (t) => t.units?.subjects?.user_id === session.user.id
              )

              const total = myTopics.length
              const completed = myTopics.filter((t) => t.status === 'completed').length
              const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0

              const totalSeconds = myTopics.reduce(
                (sum, t) => sum + (t.time_spent_seconds || 0), 0
              )
              const hours = Math.floor(totalSeconds / 3600)
              const minutes = Math.floor((totalSeconds % 3600) / 60)
              const timeSpent = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`

              setStats({
                status: 'On track',
                streak: profile?.current_streak || 0,
                completion: completionPct,
                timeSpent,
              })
            })
        })

      // Fetch topic completion per subject
      supabase
        .from('topics')
        .select('status, units(subject_id)')
        .then(({ data: allTopics }) => {
          if (!allTopics) return
          setSubjects((prev) =>
            prev.map((subject) => {
              const subjectTopics = allTopics.filter(
                (t) => t.units?.subject_id === subject.id
              )
              const total = subjectTopics.length
              const done = subjectTopics.filter(
                (t) => t.status === 'completed'
              ).length
              return {
                ...subject,
                completion: total > 0 ? Math.round((done / total) * 100) : 0,
              }
            })
          )
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

  const handleDeleteSubject = async (e, subjectId) => {
    e.preventDefault() // stop Link navigation
    e.stopPropagation()
    const confirmed = window.confirm('Are you sure you want to remove this subject? All units, topics, and materials will be deleted.')
    if (!confirmed) return

    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', subjectId)

    if (!error) {
      setSubjects((prev) => prev.filter((s) => s.id !== subjectId))
    }
  }

  if (loading) return null

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
  const quote = motivationalQuotes[dayOfYear % motivationalQuotes.length]


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
        <StatTile label="Status" value={stats.status} />
        <StatTile label="Current streak" value={`${stats.streak} days`} />
        <StatTile label="Overall completion" value={`${stats.completion}%`} />
        <StatTile label="Time spent" value={stats.timeSpent} />
      </div>

      {/* Today panel */}
      <div className="border rounded-lg p-4 mb-8 bg-white">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700">Today</p>
          <Link href="/timetable" className="text-xs text-gray-400 hover:text-gray-700">
            View full timetable →
          </Link>
        </div>
        {todaySessions.length === 0 ? (
          <p className="text-gray-400 text-sm">
            No sessions scheduled —{' '}
            <Link href="/timetable" className="underline">
              generate a timetable
            </Link>
          </p>
        ) : (
          <div className="space-y-2">
            {todaySessions.map((session) => (
              <div
                key={session.id}
                onClick={() =>
                  router.push(`/subject/${session.subject_id}/topic/${session.topic_id}`)
                }
                className="flex items-center justify-between py-2 border-b last:border-0 cursor-pointer hover:bg-gray-50 rounded px-1"
              >
                <div>
                  <p className="text-sm font-medium">{session.topics?.name}</p>
                  <p className="text-xs text-gray-400">{session.subjects?.name}</p>
                </div>
                <p className="text-xs text-gray-500">{session.topics?.minutes} min</p>
              </div>
            ))}
          </div>
        )}
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
            <SubjectCard key={subject.id} subject={subject} onDelete={handleDeleteSubject} />
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

function SubjectCard({ subject, onDelete }) {
  return (
    <Link href={`/subject/${subject.id}`}>
      <div className="border rounded-lg p-4 bg-white hover:shadow-sm cursor-pointer transition relative">
        <button
          onClick={(e) => onDelete(e, subject.id)}
          className="absolute top-2 right-2 text-gray-300 hover:text-red-400 text-sm"
          title="Remove subject"
        >
          ✕
        </button>
        <p className="text-xs text-gray-400 uppercase">{subject.category.replace('_', ' ')}</p>
        <p className="font-medium mt-1 pr-4">{subject.name}</p>
        <div className="w-full bg-gray-100 rounded-full h-2 mt-3 mb-2">
          <div
            className="bg-black h-2 rounded-full"
            style={{ width: `${subject.completion ?? 0}%` }}
          />
        </div>
        <p className="text-xs text-gray-400">
          {subject.completion ?? 0}% complete
        </p>
    </div>
    </Link >
  )
}