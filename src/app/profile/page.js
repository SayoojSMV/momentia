'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [usernameStatus, setUsernameStatus] = useState(null) // 'available' | 'taken' | 'checking'
  const [stats, setStats] = useState({
    totalMinutes: 0,
    topicsCompleted: 0,
    subjectsCount: 0,
    streak: 0,
  })
  const [activityData, setActivityData] = useState({})
  const fileInputRef = useRef(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
        return
      }
      setUser(session.user)
      fetchProfile(session.user)
      fetchStats(session.user.id)
      fetchActivityData(session.user.id)
    })
  }, [router])

  const fetchProfile = async (user) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!error && data) {
      setProfile(data)
      setEditName(data.full_name || user.user_metadata?.full_name || '')
      setEditUsername(data.username || '')
      setAvatarUrl(data.avatar_url || user.user_metadata?.avatar_url || null)
    }
    setLoading(false)
  }

  const fetchStats = async (userId) => {
    // Subjects count
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id')
      .eq('user_id', userId)

    // Topics completed and time spent
    const { data: units } = await supabase
      .from('units')
      .select('id')
      .in('subject_id', (subjects || []).map((s) => s.id))

    const { data: topics } = await supabase
      .from('topics')
      .select('status, time_spent_seconds')
      .in('unit_id', (units || []).map((u) => u.id))

    const totalSeconds = (topics || []).reduce((sum, t) => sum + (t.time_spent_seconds || 0), 0)
    const completed = (topics || []).filter((t) => t.status === 'completed').length

    // Streak from profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('current_streak')
      .eq('id', userId)
      .single()

    setStats({
      totalMinutes: Math.floor(totalSeconds / 60),
      topicsCompleted: completed,
      subjectsCount: (subjects || []).length,
      streak: profileData?.current_streak || 0,
    })
  }

  const fetchActivityData = async (userId) => {
    // Get all subjects for this user
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id')
      .eq('user_id', userId)

    if (!subjects?.length) return

    const { data: units } = await supabase
      .from('units')
      .select('id')
      .in('subject_id', subjects.map((s) => s.id))

    if (!units?.length) return

    const { data: topics } = await supabase
      .from('topics')
      .select('time_spent_seconds, updated_at')
      .in('unit_id', units.map((u) => u.id))
      .gt('time_spent_seconds', 0)

    // Group time by date
    const activity = {}
      ; (topics || []).forEach((topic) => {
        if (!topic.updated_at) return
        const date = topic.updated_at.split('T')[0]
        activity[date] = (activity[date] || 0) + (topic.time_spent_seconds || 0)
      })

    setActivityData(activity)
  }

  const handleSaveProfile = async () => {
    if (usernameStatus === 'taken' || usernameStatus === 'checking') return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editName.trim(),
        username: editUsername.trim().toLowerCase().replace(/\s+/g, '_') || null,
      })
      .eq('id', user.id)

    if (!error) {
      setProfile((prev) => ({
        ...prev,
        full_name: editName.trim(),
        username: editUsername.trim().toLowerCase().replace(/\s+/g, '_'),
      }))
      setEditing(false)
    }
    setSaving(false)
  }

  const checkUsername = async (value) => {
    const cleaned = value.trim().toLowerCase().replace(/\s+/g, '_')

    if (!cleaned) {
      setUsernameStatus(null)
      return
    }
    if (cleaned === profile?.username) {
      setUsernameStatus('available')
      return
    }
    setUsernameStatus('checking')

    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', cleaned)
      .limit(1)

    setUsernameStatus(data?.length > 0 ? 'taken' : 'available')
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadingAvatar(true)

    const filePath = `${user.id}/avatar_${Date.now()}.${file.name.split('.').pop()}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      console.error(uploadError)
      setUploadingAvatar(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id)

    setAvatarUrl(publicUrl)
    setUploadingAvatar(false)
    e.target.value = ''
  }

  const handleRemoveAvatar = async () => {
    const confirmed = window.confirm('Remove your profile photo?')
    if (!confirmed) return

    await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', user.id)

    setAvatarUrl(null)
  }

  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes}m`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  // Generate last 15 weeks of dates for the calendar
  const generateCalendarWeeks = () => {
    const weeks = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Start from 15 weeks ago, on a Sunday
    const start = new Date(today)
    start.setDate(today.getDate() - (15 * 7) + (7 - today.getDay()))

    for (let w = 0; w < 15; w++) {
      const week = []
      for (let d = 0; d < 7; d++) {
        const date = new Date(start)
        date.setDate(start.getDate() + w * 7 + d)
        const dateStr = date.toISOString().split('T')[0]
        const seconds = activityData[dateStr] || 0
        const isFuture = date > today
        week.push({ dateStr, seconds, isFuture })
      }
      weeks.push(week)
    }
    return weeks
  }

  const getActivityColor = (seconds) => {
    if (seconds === 0) return 'bg-gray-100'
    if (seconds < 600) return 'bg-green-200'   // < 10 min
    if (seconds < 1800) return 'bg-green-400'  // < 30 min
    if (seconds < 3600) return 'bg-green-600'  // < 1 hour
    return 'bg-green-800'                       // 1 hour+
  }

  const weeks = generateCalendarWeeks()
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (loading) return null

  return (
    <main className="min-h-screen bg-gray-50 p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Profile</h1>

      {/* Profile card */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl text-gray-400">
                  {profile?.full_name?.[0] || user?.email?.[0] || '?'}
                </span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 w-6 h-6 bg-black text-white rounded-full text-xs flex items-center justify-center hover:bg-gray-800"
              title="Change photo"
            >
              {uploadingAvatar ? '...' : '+'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            {avatarUrl && (
              <button
                onClick={handleRemoveAvatar}
                className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                title="Remove photo"
              >
                ✕
              </button>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            {!editing ? (
              <>
                <p className="text-xl font-semibold">
                  {profile?.full_name || user?.user_metadata?.full_name || 'No name'}
                </p>
                {profile?.username && (
                  <p className="text-sm text-gray-400">@{profile.username}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">{user?.email}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Joined {new Date(user?.created_at).toLocaleDateString('en-IN', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                <button
                  onClick={() => {
                    setEditing(true)
                    setUsernameStatus(null)
                  }}
                  className="mt-3 text-xs border rounded px-3 py-1 hover:bg-gray-50"
                >
                  Edit profile
                </button>
              </>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Display name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Username</label>
                  <div className={`flex items-center border rounded px-3 py-2 text-sm focus-within:ring-1 ${usernameStatus === 'taken' ? 'border-red-300 focus-within:ring-red-300' :
                      usernameStatus === 'available' ? 'border-green-300 focus-within:ring-green-300' :
                        'focus-within:ring-black'
                    }`}>
                    <span className="text-gray-400 mr-1">@</span>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => {
                        setEditUsername(e.target.value)
                        checkUsername(e.target.value)
                      }}
                      className="flex-1 focus:outline-none"
                      placeholder="yourhandle"
                    />
                  </div>
                  {usernameStatus === 'checking' && (
                    <p className="text-xs text-gray-400 mt-1">Checking...</p>
                  )}
                  {usernameStatus === 'taken' && (
                    <p className="text-xs text-red-500 mt-1">Username unavailable</p>
                  )}
                  {usernameStatus === 'available' && (
                    <p className="text-xs text-green-600 mt-1">Username available ✓</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving || usernameStatus === 'taken' || usernameStatus === 'checking'}
                    className="bg-black text-white text-xs px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="text-xs border px-4 py-2 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4 text-center">
          <p className="text-2xl font-semibold">{stats.subjectsCount}</p>
          <p className="text-xs text-gray-400 mt-1">Subjects</p>
        </div>
        <div className="bg-white border rounded-lg p-4 text-center">
          <p className="text-2xl font-semibold">{stats.topicsCompleted}</p>
          <p className="text-xs text-gray-400 mt-1">Topics done</p>
        </div>
        <div className="bg-white border rounded-lg p-4 text-center">
          <p className="text-2xl font-semibold">{formatTime(stats.totalMinutes)}</p>
          <p className="text-xs text-gray-400 mt-1">Time studied</p>
        </div>
        <div className="bg-white border rounded-lg p-4 text-center">
          <p className="text-2xl font-semibold">{stats.streak}</p>
          <p className="text-xs text-gray-400 mt-1">Day streak</p>
        </div>
      </div>

      {/* Activity calendar */}
      <div className="bg-white border rounded-lg p-6">
        <p className="text-sm font-medium mb-4">Study activity</p>
        <div className="overflow-x-auto">
          <div className="flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-1 mr-1">
              <div className="h-3" /> {/* spacer for header */}
              {dayLabels.map((day) => (
                <div key={day} className="h-3 flex items-center">
                  <span className="text-xs text-gray-400 w-6">{day[0]}</span>
                </div>
              ))}
            </div>

            {/* Week columns */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {/* Month label on first day of month */}
                <div className="h-3 flex items-center">
                  {week[0] && new Date(week[0].dateStr).getDate() <= 7 && (
                    <span className="text-xs text-gray-400">
                      {new Date(week[0].dateStr).toLocaleDateString('en-IN', { month: 'short' })}
                    </span>
                  )}
                </div>
                {week.map((day) => (
                  <div
                    key={day.dateStr}
                    title={
                      day.isFuture
                        ? ''
                        : day.seconds > 0
                          ? `${day.dateStr}: ${Math.floor(day.seconds / 60)} min`
                          : `${day.dateStr}: No activity`
                    }
                    className={`w-3 h-3 rounded-sm ${day.isFuture ? 'bg-gray-50' : getActivityColor(day.seconds)
                      }`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-4 justify-end">
          <span className="text-xs text-gray-400">Less</span>
          <div className="w-3 h-3 rounded-sm bg-gray-100" />
          <div className="w-3 h-3 rounded-sm bg-green-200" />
          <div className="w-3 h-3 rounded-sm bg-green-400" />
          <div className="w-3 h-3 rounded-sm bg-green-600" />
          <div className="w-3 h-3 rounded-sm bg-green-800" />
          <span className="text-xs text-gray-400">More</span>
        </div>
      </div>
    </main>
  )
}