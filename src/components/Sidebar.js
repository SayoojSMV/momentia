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

// On mobile, profile and settings live in the profile dropdown menu
// so we exclude them from the mobile drawer nav
const mobileNavItems = [
  { href: '/', label: 'Dashboard', icon: '⊞' },
  { href: '/timetable', label: 'Timetable', icon: '📅' },
  { href: '/friends', label: 'Friends', icon: '👥' },
]

export default function Sidebar() {
  const { sidebarDefault, darkMode, toggleDarkMode } = useTheme()
  const [expanded, setExpanded] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
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
    if (sidebarDefault === 'expanded') setExpanded(true)
  }, [sidebarDefault])

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

      // Fetch avatar from profiles
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

  // Close mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false)
    setProfileMenuOpen(false)
  }, [pathname])

  // Close profile menu on outside click
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

  // Avatar component — shows photo or initial fallback
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

  // Shared nav content used in both desktop sidebar and mobile drawer
  const NavContent = ({ onNavigate, items = navItems }) => (
    <>
      <nav className="flex-1 overflow-y-auto py-2">
        {items.map((item) => {
          const active = pathname === item.href
          const showDot = item.href === '/friends' && hasUnread
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center h-11 px-4 gap-3 text-sm transition hover:bg-gray-50 dark:hover:bg-gray-800 ${active
                  ? 'text-black dark:text-white font-medium bg-gray-50 dark:bg-gray-800'
                  : 'text-gray-500 dark:text-gray-400'
                }`}
            >
              <span className="text-base flex-shrink-0 relative">
                {item.icon}
                {showDot && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}

        {/* Subjects section */}
        <div className="mt-2">
          <button
            onClick={() => setShowSubjects((prev) => !prev)}
            className="flex items-center w-full h-11 px-4 gap-3 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <span className="text-base flex-shrink-0">📚</span>
            <span className="flex-1 text-left truncate">Subjects</span>
            <span className="text-xs">{showSubjects ? '▲' : '▼'}</span>
          </button>
          {showSubjects && (
            <div className="pl-4 pb-2">
              {subjects.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 px-4 py-2">No subjects yet</p>
              ) : (
                subjects.map((subject) => (
                  <Link
                    key={subject.id}
                    href={`/subject/${subject.id}`}
                    onClick={onNavigate}
                    className={`flex items-center gap-2 px-4 py-2 text-xs rounded hover:bg-gray-50 dark:hover:bg-gray-800 ${pathname === `/subject/${subject.id}`
                        ? 'text-black dark:text-white font-medium'
                        : 'text-gray-500 dark:text-gray-400'
                      }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
                    <span className="truncate">{subject.name}</span>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </nav>

      <div className="border-t dark:border-gray-700 py-2">
        <button
          onClick={toggleDarkMode}
          className="flex items-center h-11 px-4 gap-3 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 w-full"
        >
          <span className="text-base flex-shrink-0">{darkMode ? '☀️' : '🌙'}</span>
          <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>
        </button>
        <button
          onClick={handleSignOut}
          className="flex items-center h-11 px-4 gap-3 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 w-full"
        >
          <span className="text-base flex-shrink-0">🚪</span>
          <span>Sign out</span>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* ── DESKTOP SIDEBAR (md and above) ── */}
      <aside className={`hidden md:flex fixed top-0 left-0 h-full bg-white dark:bg-gray-900 border-r dark:border-gray-700 z-40 flex-col transition-all duration-200 ${expanded ? 'w-56' : 'w-14'
        }`}>
        <div className="h-14 flex items-center justify-between border-b dark:border-gray-700 w-full px-4 flex-shrink-0">
          <button
            onClick={() => setExpanded((prev) => !prev)}
            className="flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white gap-3"
            title={expanded ? 'Collapse' : 'Expand'}
          >
            <span className="text-lg flex-shrink-0">☰</span>
            {expanded && <span className="text-sm font-semibold dark:text-white">Momentia</span>}
          </button>
          
          {/* Notification Bell in expanded desktop header */}
          {expanded && <NotificationBell />}
        </div>

        {expanded ? (
          <NavContent onNavigate={() => setMobileOpen(false)} items={navItems} />
        ) : (
          <>
            <nav className="flex-1 overflow-y-auto py-2">
              {navItems.map((item) => {
                const active = pathname === item.href
                const showDot = item.href === '/friends' && hasUnread
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-center h-11 px-4 text-sm transition hover:bg-gray-50 dark:hover:bg-gray-800 ${active
                        ? 'text-black dark:text-white bg-gray-50 dark:bg-gray-800'
                        : 'text-gray-500 dark:text-gray-400'
                      }`}
                    title={item.label}
                  >
                    <span className="text-base relative">
                      {item.icon}
                      {showDot && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                      )}
                    </span>
                  </Link>
                )
              })}
              <button
                className="flex items-center justify-center w-full h-11 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                title="Subjects"
                onClick={() => setExpanded(true)}
              >
                <span className="text-base">📚</span>
              </button>
            </nav>
            <div className="border-t dark:border-gray-700 py-2 flex flex-col items-center">
              {/* Notification Bell in collapsed desktop bottom navigation */}
              <div className="flex items-center justify-center w-full h-11">
                <NotificationBell />
              </div>
              <button
                onClick={toggleDarkMode}
                className="flex items-center justify-center w-full h-11 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                title={darkMode ? 'Light mode' : 'Dark mode'}
              >
                <span className="text-base">{darkMode ? '☀️' : '🌙'}</span>
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center justify-center w-full h-11 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                title="Sign out"
              >
                <span className="text-base">🚪</span>
              </button>
            </div>
          </>
        )}
      </aside>

      {expanded && (
        <div className="hidden md:block fixed inset-0 z-30" onClick={() => setExpanded(false)} />
      )}

      <div className={`hidden md:block flex-shrink-0 ${expanded ? 'w-56' : 'w-14'}`} />

      {/* ── MOBILE TOP BAR (below md) ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white dark:bg-gray-900 border-b dark:border-gray-700 z-40 flex items-center justify-between px-4">
        {/* Hamburger */}
        <button
          onClick={() => setMobileOpen(true)}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white text-xl"
        >
          ☰
        </button>

        {/* Brand */}
        <span className="text-sm font-semibold dark:text-white">Momentia</span>

        {/* Right side — unread dot + Notification Bell + profile menu */}
        <div className="flex items-center gap-3" ref={profileMenuRef}>
          {/* Notification Bell on Mobile */}
          <NotificationBell />

          {/* Unread message dot */}
          {hasUnread && (
            <span className="w-2 h-2 bg-red-500 rounded-full" />
          )}

          {/* Profile picture button */}
          <button
            onClick={() => setProfileMenuOpen((prev) => !prev)}
            className="relative"
          >
            <Avatar size="sm" />
          </button>

          {/* Dropdown menu */}
          {profileMenuOpen && (
            <div className="absolute top-14 right-0 w-52 bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
              {/* User info header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b dark:border-gray-700">
                <Avatar size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-medium dark:text-white truncate">
                    {user?.user_metadata?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>

              {/* Menu items */}
              <Link
                href="/profile"
                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <span>👤</span>
                <span>Profile</span>
              </Link>

              <Link
                href="/settings"
                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <span>⚙️</span>
                <span>Settings</span>
              </Link>

              <button
                onClick={toggleDarkMode}
                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition w-full"
              >
                <span>{darkMode ? '☀️' : '🌙'}</span>
                <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>
              </button>

              <div className="border-t dark:border-gray-700 mt-1 pt-1">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition w-full"
                >
                  <span>🚪</span>
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile top bar spacer */}
      <div className="md:hidden h-14 flex-shrink-0" />

      {/* ── MOBILE DRAWER ── */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="md:hidden fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-900 border-r dark:border-gray-700 z-50 flex flex-col">
            <div className="h-14 flex items-center justify-between px-4 border-b dark:border-gray-700 flex-shrink-0">
              <span className="text-sm font-semibold dark:text-white">Momentia</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white text-lg"
              >
                ✕
              </button>
            </div>
            <NavContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </>
      )}
    </>
  )
}