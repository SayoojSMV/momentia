'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import { useTheme } from '@/lib/ThemeContext'
import Link from 'next/link'

const navItems = [
  { href: '/', label: 'Dashboard', icon: '⊞' },
  { href: '/timetable', label: 'Timetable', icon: '📅' },
  { href: '/friends', label: 'Friends', icon: '👥' },
  { href: '/profile', label: 'Profile', icon: '👤' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function Sidebar() {
  const { sidebarDefault } = useTheme()
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (sidebarDefault === 'expanded') setExpanded(true)
  }, [sidebarDefault])

  const [subjects, setSubjects] = useState([])
  const [showSubjects, setShowSubjects] = useState(false)
  const [user, setUser] = useState(null)
  const [hasUnread, setHasUnread] = useState(false)
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
        .then(({ data }) => {
          if (data) setSubjects(data)
        })
    })
  }, [])

  useEffect(() => {
    if (!user) return

    const checkUnread = async () => {
      const { data } = await supabase
        .from('messages')
        .select('id')
        .eq('receiver_id', user.id)
        .eq('is_read', false)
        .limit(1)

      setHasUnread(data?.length > 0)
    }

    checkUnread()

    const channel = supabase
      .channel(`sidebar-unread-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => checkUnread()
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  // Re-check unread on pathname change
  useEffect(() => {
    if (!user) return

    const checkUnread = async () => {
      const { data } = await supabase
        .from('messages')
        .select('id')
        .eq('receiver_id', user.id)
        .eq('is_read', false)
        .limit(1)

      setHasUnread(data?.length > 0)
    }

    if (pathname === '/friends') {
      const timer = setTimeout(checkUnread, 1500)
      return () => clearTimeout(timer)
    } else {
      checkUnread()
    }
  }, [user, pathname])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (pathname === '/login' || pathname?.startsWith('/auth')) return null

  return (
    <>
      <aside
        className={`fixed top-0 left-0 h-full bg-white dark:bg-gray-900 border-r dark:border-gray-700 z-40 flex flex-col transition-all duration-200 ${
          expanded ? 'w-56' : 'w-14'
        }`}
      >
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="h-14 flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white flex-shrink-0 border-b dark:border-gray-700 w-full px-4 gap-3"
          title={expanded ? 'Collapse' : 'Expand'}
        >
          <span className="text-lg flex-shrink-0">☰</span>
          {expanded && (
            <span className="text-sm font-semibold dark:text-white">Momentia</span>
          )}
        </button>

        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map((item) => {
            const active = pathname === item.href
            const showDot = item.href === '/friends' && hasUnread
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setExpanded(false)}
                className={`flex items-center h-11 px-4 gap-3 text-sm transition hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  active
                    ? 'text-black dark:text-white font-medium bg-gray-50 dark:bg-gray-800'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
                title={!expanded ? item.label : undefined}
              >
                <span className="text-base flex-shrink-0 relative">
                  {item.icon}
                  {showDot && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </span>
                {expanded && <span className="truncate">{item.label}</span>}
              </Link>
            )
          })}

          {expanded && (
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
                    <p className="text-xs text-gray-400 dark:text-gray-500 px-4 py-2">
                      No subjects yet
                    </p>
                  ) : (
                    subjects.map((subject) => (
                      <Link
                        key={subject.id}
                        href={`/subject/${subject.id}`}
                        onClick={() => setExpanded(false)}
                        className={`flex items-center gap-2 px-4 py-2 text-xs rounded hover:bg-gray-50 dark:hover:bg-gray-800 ${
                          pathname === `/subject/${subject.id}`
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
          )}

          {!expanded && (
            <button
              className="flex items-center justify-center w-full h-11 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              title="Subjects"
              onClick={() => setExpanded(true)}
            >
              <span className="text-base">📚</span>
            </button>
          )}
        </nav>

        <div className="border-t dark:border-gray-700 py-2">
          <button
            onClick={handleSignOut}
            className="flex items-center h-11 px-4 gap-3 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 w-full"
            title={!expanded ? 'Sign out' : undefined}
          >
            <span className="text-base flex-shrink-0">🚪</span>
            {expanded && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {expanded && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setExpanded(false)}
        />
      )}

      <div className="w-14 flex-shrink-0" />
    </>
  )
}