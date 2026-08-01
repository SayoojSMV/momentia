'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import { useTheme } from '@/lib/ThemeContext'
import Link from 'next/link'
import NotificationBell from './NotificationBell'

const navItems = [
  { href: '/', label: 'Dashboard', icon: '⊞' },
  { href: '/timetable', label: 'Timetable', icon: '📅' },
  { href: '/friends', label: 'Friends', icon: '👥' },
  { href: '/profile', label: 'Profile', icon: '👤' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function Sidebar() {
  const { darkMode, toggleDarkMode } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [subjects, setSubjects] = useState([])
  const [showSubjects, setShowSubjects] = useState(false)
  const [user, setUser] = useState(null)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [hasUnread, setHasUnread] = useState(false)
  
  const profileMenuRef = useRef(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      setUser(session.user)

      supabase
        .from('subjects')
        .select('id, name, category')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true })
        .then(({ data }) => { if (data) setSubjects(data) })

      supabase
        .from('profiles')
        .select('avatar_url, full_name')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          if (data?.avatar_url) setAvatarUrl(data.avatar_url)
        })
    })
  }, [])

  useEffect(() => {
    if (!user) return
    const checkUnread = async () => {
      const { data } = await supabase
        .from('messages').select('id')
        .eq('receiver_id', user.id).eq('is_read', false).limit(1)
      setHasUnread(data?.length > 0)
    }
    checkUnread()
    const channel = supabase
      .channel(`sidebar-unread-${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, () => checkUnread())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  useEffect(() => {
    if (!user) return
    const checkUnread = async () => {
      const { data } = await supabase
        .from('messages').select('id')
        .eq('receiver_id', user.id).eq('is_read', false).limit(1)
      setHasUnread(data?.length > 0)
    }
    if (pathname === '/friends') {
      const timer = setTimeout(checkUnread, 1500)
      return () => clearTimeout(timer)
    } else {
      checkUnread()
    }
  }, [user, pathname])

  // Close sidebar drawer and profile menu on navigation
  useEffect(() => {
    setSidebarOpen(false)
    setProfileMenuOpen(false)
  }, [pathname])

  // Close profile menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  // Avatar component with fallback initial
  const Avatar = ({ size = 'sm' }) => {
    const sizeClass = size === 'sm' ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-base'
    const initial = user?.user_metadata?.full_name?.[0] || user?.email?.[0] || '?'
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-medium text-gray-600 dark:text-gray-300 flex-shrink-0`}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          initial.toUpperCase()
        )}
      </div>
    )
  }

  if (pathname === '/login' || pathname?.startsWith('/auth')) return null

  return (
    <>
      {/* ── TOP HEADER (Desktop & Mobile) ── */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b dark:border-gray-800 z-40 flex items-center justify-between px-4 transition-colors">
        {/* Left Side: Burger Menu + Brand Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            aria-label="Open Navigation"
          >
            <span className="text-xl leading-none">☰</span>
          </button>

          {/* Clickable Brand Logo -> Redirects to Dashboard */}
          <Link 
            href="/" 
            className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white hover:opacity-80 transition"
          >
            <span className="text-lg">✨</span>
            <span>Momentia</span>
          </Link>
        </div>

        {/* Right Side: Quick Actions + Notification Bell + Profile Menu */}
        <div className="flex items-center gap-2 sm:gap-3" ref={profileMenuRef}>
          {/* Notification Bell */}
          <NotificationBell />

          {/* User Profile Avatar */}
          <button
            onClick={() => setProfileMenuOpen((prev) => !prev)}
            className="relative focus:outline-none rounded-full ring-2 ring-transparent hover:ring-gray-300 dark:hover:ring-gray-700 transition"
          >
            <Avatar size="sm" />
            {hasUnread && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-gray-900 rounded-full" />
            )}
          </button>

          {/* Profile Dropdown */}
          {profileMenuOpen && (
            <div className="absolute top-12 right-4 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center gap-3 px-4 py-3 border-b dark:border-gray-800">
                <Avatar size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user?.user_metadata?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>

              <Link
                href="/profile"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <span>👤</span>
                <span>Profile</span>
              </Link>

              <Link
                href="/settings"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <span>⚙️</span>
                <span>Settings</span>
              </Link>

              <button
                onClick={toggleDarkMode}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition w-full text-left"
              >
                <span>{darkMode ? '☀️' : '🌙'}</span>
                <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>
              </button>

              <div className="border-t dark:border-gray-800 mt-1 pt-1">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition w-full text-left"
                >
                  <span>🚪</span>
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── MODERN BACKDROP BLUR OVERLAY ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SLIDE-OUT OFF-CANVAS SIDEBAR ── */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-900 border-r dark:border-gray-800 z-50 flex flex-col transform transition-transform duration-300 ease-in-out shadow-2xl ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b dark:border-gray-800 flex-shrink-0">
          <Link 
            href="/" 
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white"
          >
            <span className="text-lg">✨</span>
            <span>Momentia</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 text-gray-500 hover:text-gray-800 dark:hover:text-white text-lg rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Drawer Navigation Content */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href
            const showDot = item.href === '/friends' && hasUnread
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center h-10 px-3 rounded-lg text-sm transition ${
                  active
                    ? 'text-black dark:text-white font-medium bg-gray-100 dark:bg-gray-800'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                }`}
              >
                <span className="text-base mr-3 relative">
                  {item.icon}
                  {showDot && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}

          {/* Accordion: Subjects */}
          <div className="pt-2">
            <button
              onClick={() => setShowSubjects((prev) => !prev)}
              className="flex items-center w-full h-10 px-3 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition"
            >
              <span className="text-base mr-3">📚</span>
              <span className="flex-1 text-left truncate">Subjects</span>
              <span className="text-xs">{showSubjects ? '▲' : '▼'}</span>
            </button>
            {showSubjects && (
              <div className="pl-6 pt-1 space-y-1">
                {subjects.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 px-3 py-1.5">No subjects yet</p>
                ) : (
                  subjects.map((subject) => (
                    <Link
                      key={subject.id}
                      href={`/subject/${subject.id}`}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition ${
                        pathname === `/subject/${subject.id}`
                          ? 'text-black dark:text-white font-medium bg-gray-100 dark:bg-gray-800'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 flex-shrink-0" />
                      <span className="truncate">{subject.name}</span>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>
        </nav>

        {/* Drawer Footer Actions */}
        <div className="border-t dark:border-gray-800 p-2 space-y-1">
          <button
            onClick={toggleDarkMode}
            className="flex items-center h-10 px-3 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition w-full"
          >
            <span className="text-base mr-3">{darkMode ? '☀️' : '🌙'}</span>
            <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center h-10 px-3 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition w-full"
          >
            <span className="text-base mr-3">🚪</span>
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  )
}