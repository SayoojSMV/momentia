'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const DESIGNATIONS = [
  'Engineering',
  'Medicine',
  'Law',
  'MBA',
  'Arts & Humanities',
  'Science',
  'Commerce',
  'Working Professional',
  'Self-learner',
  'Other',
]

const YEARS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  'Postgraduate',
  'PhD',
  'Working',
  'Other',
]

const SESSION_LENGTHS = [25, 45, 60, 90]
const REST_DAYS = ['None', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const REMINDER_DAYS = [3, 5, 7, 10]

export default function SettingsPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  // Account fields
  const [designation, setDesignation] = useState('')
  const [institution, setInstitution] = useState('')
  const [yearOfStudy, setYearOfStudy] = useState('')
  const [priorSubjects, setPriorSubjects] = useState([])
  const [priorInput, setPriorInput] = useState('')

  // Study preference fields
  const [dailyMinutes, setDailyMinutes] = useState(120)
  const [sessionLength, setSessionLength] = useState(45)
  const [restDay, setRestDay] = useState('None')
  const [reminderDays, setReminderDays] = useState(5)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
        return
      }
      setUser(session.user)

      supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          if (!data) return
          setDesignation(data.designation || '')
          setInstitution(data.institution || '')
          setYearOfStudy(data.year_of_study || '')
          setPriorSubjects(data.prior_subjects || [])
          setDailyMinutes(data.daily_study_minutes || 120)
          setSessionLength(data.session_length_minutes || 45)
          setRestDay(data.rest_day || 'None')
          setReminderDays(data.exam_reminder_days || 5)
          setLoading(false)
        })
    })
  }, [router])

  const handleAddPriorSubject = () => {
    const val = priorInput.trim()
    if (!val || priorSubjects.includes(val)) return
    setPriorSubjects((prev) => [...prev, val])
    setPriorInput('')
  }

  const handleRemovePriorSubject = (subject) => {
    setPriorSubjects((prev) => prev.filter((s) => s !== subject))
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)

    const { error } = await supabase
      .from('profiles')
      .update({
        designation,
        institution,
        year_of_study: yearOfStudy,
        prior_subjects: priorSubjects,
        daily_study_minutes: dailyMinutes,
        session_length_minutes: sessionLength,
        rest_day: restDay,
        exam_reminder_days: reminderDays,
      })
      .eq('id', user.id)

    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  if (loading) return null

  return (
    <main className="min-h-screen bg-gray-50 p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>

      {/* Account details */}
      <section className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-base font-semibold mb-4">Account</h2>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 block mb-1">
              What are you pursuing?
            </label>
            <select
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="">Select designation</option>
              {DESIGNATIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-1">
              Institution / University
              <span className="text-gray-400 ml-1">(optional)</span>
            </label>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="e.g. REVA University"
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-1">
              Year of study
            </label>
            <select
              value={yearOfStudy}
              onChange={(e) => setYearOfStudy(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="">Select year</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-1">
              Subjects you already know
            </label>
            <p className="text-xs text-gray-400 mb-2">
              The AI will use this to calibrate content difficulty
            </p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={priorInput}
                onChange={(e) => setPriorInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPriorSubject()}
                placeholder="e.g. Python, Calculus, History"
                className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
              />
              <button
                onClick={handleAddPriorSubject}
                className="bg-black text-white text-sm px-3 py-2 rounded-md hover:bg-gray-800"
              >
                Add
              </button>
            </div>
            {priorSubjects.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {priorSubjects.map((s) => (
                  <span
                    key={s}
                    className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full"
                  >
                    {s}
                    <button
                      onClick={() => handleRemovePriorSubject(s)}
                      className="text-gray-400 hover:text-gray-700 ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Study preferences */}
      <section className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-base font-semibold mb-4">Study preferences</h2>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 block mb-1">
              Daily study goal
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={30}
                max={480}
                step={30}
                value={dailyMinutes}
                onChange={(e) => setDailyMinutes(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-medium w-20 text-right">
                {dailyMinutes >= 60
                  ? `${Math.floor(dailyMinutes / 60)}h ${dailyMinutes % 60 > 0 ? `${dailyMinutes % 60}m` : ''}`
                  : `${dailyMinutes}m`}
              </span>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-1">
              Preferred session length
            </label>
            <div className="flex gap-2">
              {SESSION_LENGTHS.map((len) => (
                <button
                  key={len}
                  onClick={() => setSessionLength(len)}
                  className={`flex-1 py-2 rounded-md text-sm border transition ${
                    sessionLength === len
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {len}m
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-1">
              Rest day
              <span className="text-gray-400 ml-1 text-xs">
                (timetable skips this day)
              </span>
            </label>
            <select
              value={restDay}
              onChange={(e) => setRestDay(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
            >
              {REST_DAYS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-1">
              Exam reminder lead time
            </label>
            <div className="flex gap-2">
              {REMINDER_DAYS.map((d) => (
                <button
                  key={d}
                  onClick={() => setReminderDays(d)}
                  className={`flex-1 py-2 rounded-md text-sm border transition ${
                    reminderDays === d
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {d} days
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Dashboard shows "Falling behind" this many days before an exam
            </p>
          </div>
        </div>
      </section>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full py-3 rounded-lg text-sm font-medium transition ${
          saving
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : saved
            ? 'bg-green-600 text-white'
            : 'bg-black text-white hover:bg-gray-800'
        }`}
      >
        {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save settings'}
      </button>
    </main>
  )
}