'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/ThemeContext'

const DESIGNATIONS = [
  'Engineering', 'Medicine', 'Law', 'MBA', 'Arts & Humanities',
  'Science', 'Commerce', 'Working Professional', 'Self-learner', 'Other',
]

const YEARS = [
  '1st Year', '2nd Year', '3rd Year', '4th Year',
  'Postgraduate', 'PhD', 'Working', 'Other',
]

const SESSION_LENGTHS = [25, 45, 60, 90]
const REST_DAYS = ['None', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const REMINDER_DAYS = [3, 5, 7, 10]

export default function SettingsPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetting, setResetting] = useState(false)
  const router = useRouter()
  const { darkMode, toggleDarkMode, sidebarDefault, setSidebarDefault } = useTheme()

  const [designation, setDesignation] = useState('')
  const [institution, setInstitution] = useState('')
  const [yearOfStudy, setYearOfStudy] = useState('')
  const [priorSubjects, setPriorSubjects] = useState([])
  const [priorInput, setPriorInput] = useState('')
  const [dailyMinutes, setDailyMinutes] = useState(120)
  const [sessionLength, setSessionLength] = useState(45)
  const [restDay, setRestDay] = useState('None')
  const [reminderDays, setReminderDays] = useState(5)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      setUser(session.user)
      supabase.from('profiles').select('*').eq('id', session.user.id).single()
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
    const { error } = await supabase.from('profiles').update({
      designation, institution, year_of_study: yearOfStudy,
      prior_subjects: priorSubjects, daily_study_minutes: dailyMinutes,
      session_length_minutes: sessionLength, rest_day: restDay,
      exam_reminder_days: reminderDays,
    }).eq('id', user.id)
    setSaving(false)
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
  }

  const handleResetStudyData = async () => {
    setResetting(true)

    // Delete all subjects — units, topics, materials, schedule cascade automatically
    await supabase
      .from('subjects')
      .delete()
      .eq('user_id', user.id)

    // Clear schedule directly in case orphaned rows exist
    await supabase
      .from('schedule')
      .delete()
      .eq('user_id', user.id)

    setResetting(false)
    setShowResetModal(false)

    // Redirect to dashboard so the updated state is immediately visible
    router.push('/')
  }

  if (loading) return null

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Customize your preferences, academic background, and app preferences
        </p>
      </div>

      {/* Account details */}
      <section className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-6">
        <h2 className="text-base font-semibold mb-4 dark:text-white">Academic Details</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
              What are you pursuing?
            </label>
            <select
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className="w-full border dark:border-gray-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white bg-white dark:bg-gray-800 dark:text-white"
            >
              <option value="">Select designation</option>
              {DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
              Institution / University
              <span className="text-gray-400 dark:text-gray-500 ml-1">(optional)</span>
            </label>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="e.g. REVA University"
              className="w-full border dark:border-gray-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white bg-white dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
              Year of study
            </label>
            <select
              value={yearOfStudy}
              onChange={(e) => setYearOfStudy(e.target.value)}
              className="w-full border dark:border-gray-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white bg-white dark:bg-gray-800 dark:text-white"
            >
              <option value="">Select year</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
              Subjects you already know
            </label>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
              The AI will use this to calibrate content difficulty
            </p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={priorInput}
                onChange={(e) => setPriorInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPriorSubject()}
                placeholder="e.g. Python, Calculus, History"
                className="flex-1 border dark:border-gray-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white bg-white dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              />
              <button
                onClick={handleAddPriorSubject}
                className="bg-black text-white dark:bg-white dark:text-black text-xs font-medium px-4 py-2 rounded-md hover:opacity-90 transition"
              >
                Add
              </button>
            </div>
            {priorSubjects.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {priorSubjects.map((s) => (
                  <span
                    key={s}
                    className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs px-3 py-1 rounded-full"
                  >
                    {s}
                    <button
                      onClick={() => handleRemovePriorSubject(s)}
                      className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
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
      <section className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-6">
        <h2 className="text-base font-semibold mb-4 dark:text-white">Study Preferences</h2>
        <div className="space-y-5">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-2">
              Daily study goal
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range" min={30} max={480} step={30}
                value={dailyMinutes}
                onChange={(e) => setDailyMinutes(Number(e.target.value))}
                className="flex-1 accent-black dark:accent-white cursor-pointer"
              />
              <span className="text-sm font-semibold w-20 text-right dark:text-white">
                {dailyMinutes >= 60
                  ? `${Math.floor(dailyMinutes / 60)}h ${dailyMinutes % 60 > 0 ? `${dailyMinutes % 60}m` : ''}`
                  : `${dailyMinutes}m`}
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-2">
              Preferred session length
            </label>
            <div className="flex gap-2">
              {SESSION_LENGTHS.map((len) => (
                <button
                  key={len}
                  onClick={() => setSessionLength(len)}
                  className={`flex-1 py-2 rounded-md text-xs font-medium border transition ${
                    sessionLength === len
                      ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {len}m
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
              Rest day
              <span className="text-gray-400 dark:text-gray-500 ml-1">(timetable skips this day)</span>
            </label>
            <select
              value={restDay}
              onChange={(e) => setRestDay(e.target.value)}
              className="w-full border dark:border-gray-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white bg-white dark:bg-gray-800 dark:text-white"
            >
              {REST_DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-2">
              Exam reminder lead time
            </label>
            <div className="flex gap-2">
              {REMINDER_DAYS.map((d) => (
                <button
                  key={d}
                  onClick={() => setReminderDays(d)}
                  className={`flex-1 py-2 rounded-md text-xs font-medium border transition ${
                    reminderDays === d
                      ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {d} days
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
              Dashboard indicates "Falling behind" this many days prior to an scheduled exam
            </p>
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-6">
        <h2 className="text-base font-semibold mb-4 dark:text-white">Appearance</h2>
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium dark:text-white">Dark mode</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Toggle between light and dark visual interfaces
              </p>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                darkMode ? 'bg-white' : 'bg-gray-200'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-black dark:bg-gray-900 rounded-full shadow transition-transform ${
                darkMode ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium dark:text-white">Sidebar default state</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Initial layout preference when navigating pages
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSidebarDefault('collapsed')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition ${
                  sidebarDefault === 'collapsed'
                    ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Collapsed
              </button>
              <button
                onClick={() => setSidebarDefault('expanded')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition ${
                  sidebarDefault === 'expanded'
                    ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Expanded
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Save Action */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full py-3 rounded-xl text-sm font-medium transition ${
          saving
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
            : saved
            ? 'bg-green-600 text-white'
            : 'bg-black text-white dark:bg-white dark:text-black hover:opacity-90'
        }`}
      >
        {saving ? 'Saving changes...' : saved ? '✓ Settings Saved' : 'Save settings'}
      </button>

      {/* Danger Zone */}
      <section className="border border-red-200 dark:border-red-900/50 rounded-xl p-6 bg-red-50/30 dark:bg-red-950/10">
        <h2 className="text-base font-semibold text-red-600 dark:text-red-400 mb-1">
          Danger Zone
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Actions in this section are permanent and cannot be reversed.
        </p>

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium dark:text-white">Reset study data</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Deletes all subjects, units, topics, uploaded materials, and timetable schedules. Account, profile, and friends are retained.
            </p>
          </div>
          <button
            onClick={() => setShowResetModal(true)}
            className="flex-shrink-0 px-4 py-2 text-xs font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition"
          >
            Reset data
          </button>
        </div>
      </section>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-lg font-semibold dark:text-white">Reset study data?</h3>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              This will permanently delete:
            </p>
            <ul className="text-xs text-gray-600 dark:text-gray-400 mb-4 space-y-1.5 pl-4 list-disc">
              <li>All subjects and subject configuration details</li>
              <li>All units and topics</li>
              <li>All uploaded study materials</li>
              <li>Your generated timetable and study schedule</li>
              <li>All recorded study progress and time tracking</li>
            </ul>

            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-6">
              Your profile preferences and friend connections will not be deleted.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowResetModal(false)}
                disabled={resetting}
                className="px-4 py-2 text-xs font-medium border dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300 disabled:opacity-50 transition"
              >
                Cancel
              </button>
              <ResetButton onConfirm={handleResetStudyData} resetting={resetting} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ResetButton({ onConfirm, resetting }) {
  const [countdown, setCountdown] = useState(5)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (countdown === 0) { setReady(true); return }
    const t = setTimeout(() => setCountdown((prev) => prev - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  return (
    <button
      onClick={onConfirm}
      disabled={!ready || resetting}
      className="px-4 py-2 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
    >
      {resetting ? 'Resetting...' : ready ? 'Yes, reset everything' : `Wait ${countdown}s...`}
    </button>
  )
}