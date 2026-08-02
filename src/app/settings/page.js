'use client'

import { useEffect, useState, useMemo } from 'react'
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
  const [errorMsg, setErrorMsg] = useState('')
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetting, setResetting] = useState(false)
  const router = useRouter()
  const { darkMode, toggleDarkMode, sidebarDefault, setSidebarDefault } = useTheme()

  // Academic Details
  const [designation, setDesignation] = useState('')
  const [institution, setInstitution] = useState('')
  const [yearOfStudy, setYearOfStudy] = useState('')
  const [priorSubjects, setPriorSubjects] = useState([])
  const [priorInput, setPriorInput] = useState('')

  // Study Preferences
  const [dailyMinutes, setDailyMinutes] = useState(120)
  const [sessionLength, setSessionLength] = useState(45)
  const [restDay, setRestDay] = useState('None')
  const [reminderDays, setReminderDays] = useState(5)

  // Notification Preferences (New)
  const [studyStartTime, setStudyStartTime] = useState('18:00')
  const [studyEndTime, setStudyEndTime] = useState('22:00')
  const [studyRemindersEnabled, setStudyRemindersEnabled] = useState(true)
  const [examAlertsEnabled, setExamAlertsEnabled] = useState(true)

  // Initial State for Dirty Checking
  const [initialData, setInitialData] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      setUser(session.user)
      supabase.from('profiles').select('*').eq('id', session.user.id).single()
        .then(({ data, error }) => {
          if (error) {
            console.error('Failed to load profile:', error)
            setLoading(false)
            return
          }
          if (data) {
            const profileData = {
              designation: data.designation || '',
              institution: data.institution || '',
              yearOfStudy: data.year_of_study || '',
              priorSubjects: data.prior_subjects || [],
              dailyMinutes: data.daily_study_minutes || 120,
              sessionLength: data.session_length_minutes || 45,
              restDay: data.rest_day || 'None',
              reminderDays: data.exam_reminder_days || 5,
              studyStartTime: data.study_start_time || '18:00',
              studyEndTime: data.study_end_time || '22:00',
              studyRemindersEnabled: data.study_reminders_enabled ?? true,
              examAlertsEnabled: data.exam_alerts_enabled ?? true,
            }

            setDesignation(profileData.designation)
            setInstitution(profileData.institution)
            setYearOfStudy(profileData.yearOfStudy)
            setPriorSubjects(profileData.priorSubjects)
            setDailyMinutes(profileData.dailyMinutes)
            setSessionLength(profileData.sessionLength)
            setRestDay(profileData.restDay)
            setReminderDays(profileData.reminderDays)
            setStudyStartTime(profileData.studyStartTime)
            setStudyEndTime(profileData.studyEndTime)
            setStudyRemindersEnabled(profileData.studyRemindersEnabled)
            setExamAlertsEnabled(profileData.examAlertsEnabled)

            setInitialData(profileData)
          }
          setLoading(false)
        })
    })
  }, [router])

  // Compute dirty check
  const isDirty = useMemo(() => {
    if (!initialData) return false
    return (
      designation !== initialData.designation ||
      institution !== initialData.institution ||
      yearOfStudy !== initialData.yearOfStudy ||
      JSON.stringify(priorSubjects) !== JSON.stringify(initialData.priorSubjects) ||
      dailyMinutes !== initialData.dailyMinutes ||
      sessionLength !== initialData.sessionLength ||
      restDay !== initialData.restDay ||
      reminderDays !== initialData.reminderDays ||
      studyStartTime !== initialData.studyStartTime ||
      studyEndTime !== initialData.studyEndTime ||
      studyRemindersEnabled !== initialData.studyRemindersEnabled ||
      examAlertsEnabled !== initialData.examAlertsEnabled
    )
  }, [
    initialData, designation, institution, yearOfStudy, priorSubjects,
    dailyMinutes, sessionLength, restDay, reminderDays, studyStartTime,
    studyEndTime, studyRemindersEnabled, examAlertsEnabled
  ])

  const handleAddPriorSubject = () => {
    const val = priorInput.trim()
    if (!val) return
    // Case-insensitive check to avoid duplicate tags
    if (priorSubjects.some((s) => s.toLowerCase() === val.toLowerCase())) return
    setPriorSubjects((prev) => [...prev, val])
    setPriorInput('')
  }

  const handleRemovePriorSubject = (subject) => {
    setPriorSubjects((prev) => prev.filter((s) => s !== subject))
  }

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    setSaving(true)
    setSaved(false)
    setErrorMsg('')

    const payload = {
      designation,
      institution,
      year_of_study: yearOfStudy,
      prior_subjects: priorSubjects,
      daily_study_minutes: dailyMinutes,
      session_length_minutes: sessionLength,
      rest_day: restDay,
      exam_reminder_days: reminderDays,
      study_start_time: studyStartTime,
      study_end_time: studyEndTime,
      study_reminders_enabled: studyRemindersEnabled,
      exam_alerts_enabled: examAlertsEnabled,
    }

    const { error } = await supabase.from('profiles').update(payload).eq('id', user.id)
    setSaving(false)

    if (error) {
      setErrorMsg('Failed to save settings. Please try again.')
    } else {
      setSaved(true)
      setInitialData({
        designation,
        institution,
        yearOfStudy,
        priorSubjects,
        dailyMinutes,
        sessionLength,
        restDay,
        reminderDays,
        studyStartTime,
        studyEndTime,
        studyRemindersEnabled,
        examAlertsEnabled,
      })
      setTimeout(() => setSaved(false), 3000)
    }
  }

  const handleResetStudyData = async () => {
    setResetting(true)
    setErrorMsg('')

    // Explicit error-handled operations
    const { error: subjectErr } = await supabase.from('subjects').delete().eq('user_id', user.id)
    const { error: scheduleErr } = await supabase.from('schedule').delete().eq('user_id', user.id)

    setResetting(false)
    setShowResetModal(false)

    if (subjectErr || scheduleErr) {
      setErrorMsg('An error occurred while resetting study data.')
    } else {
      router.push('/')
    }
  }

  // Skeleton Loading UI
  if (loading) {
    return (
      <div className="w-full space-y-6 animate-pulse">
        <div className="h-8 w-40 bg-gray-200 dark:bg-gray-800 rounded-md" />
        <div className="h-48 w-full bg-gray-100 dark:bg-gray-900 border dark:border-gray-800 rounded-xl" />
        <div className="h-64 w-full bg-gray-100 dark:bg-gray-900 border dark:border-gray-800 rounded-xl" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="w-full space-y-6 pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Customize your preferences, notification window, and academic profile
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Academic Details */}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddPriorSubject()
                  }
                }}
                placeholder="e.g. Python, Calculus, History"
                className="flex-1 border dark:border-gray-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white bg-white dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              />
              <button
                type="button"
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
                      type="button"
                      aria-label={`Remove ${s}`}
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

      {/* Study Preferences */}
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
                  type="button"
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
                  type="button"
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
          </div>
        </div>
      </section>

      {/* Notifications & Study Reminders Window (NEW) */}
      <section className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-6">
        <h2 className="text-base font-semibold mb-1 dark:text-white">Notifications & Availability</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
          Define your free time window so study alerts only trigger when you are available.
        </p>

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                Preferred Study Start Time
              </label>
              <input
                type="time"
                value={studyStartTime}
                onChange={(e) => setStudyStartTime(e.target.value)}
                className="w-full border dark:border-gray-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white bg-white dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                Preferred Study End Time
              </label>
              <input
                type="time"
                value={studyEndTime}
                onChange={(e) => setStudyEndTime(e.target.value)}
                className="w-full border dark:border-gray-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white bg-white dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="text-sm font-medium dark:text-white">Study window reminders</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Send periodic reminders when you have pending study targets in this window
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStudyRemindersEnabled((prev) => !prev)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                studyRemindersEnabled ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-gray-800'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white dark:bg-gray-900 rounded-full shadow transition-transform ${
                studyRemindersEnabled ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t dark:border-gray-800">
            <div>
              <p className="text-sm font-medium dark:text-white">Exam countdown alerts</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Notify me on major exam milestones (14, 7, 3, and 1 day remaining)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExamAlertsEnabled((prev) => !prev)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                examAlertsEnabled ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-gray-800'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white dark:bg-gray-900 rounded-full shadow transition-transform ${
                examAlertsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
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
              type="button"
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
                type="button"
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
                type="button"
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

      {/* Primary Save Button */}
      <button
        type="submit"
        disabled={saving}
        className={`w-full py-3 rounded-xl text-sm font-medium transition ${
          saving
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
            : saved
            ? 'bg-green-600 text-white'
            : isDirty
            ? 'bg-black text-white dark:bg-white dark:text-black ring-2 ring-offset-2 ring-black dark:ring-white hover:opacity-90'
            : 'bg-black text-white dark:bg-white dark:text-black hover:opacity-90'
        }`}
      >
        {saving ? 'Saving changes...' : saved ? '✓ Settings Saved' : isDirty ? 'Save Unsaved Changes' : 'Save settings'}
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
              Deletes all subjects, units, topics, uploaded materials, and timetable schedules.
            </p>
          </div>
          <button
            type="button"
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
            </ul>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
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
    </form>
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
      type="button"
      onClick={onConfirm}
      disabled={!ready || resetting}
      className="px-4 py-2 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
    >
      {resetting ? 'Resetting...' : ready ? 'Yes, reset everything' : `Wait ${countdown}s...`}
    </button>
  )
}