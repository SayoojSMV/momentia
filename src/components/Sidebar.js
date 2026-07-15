'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

const navItems = [
  { href: '/', label: 'Dashboard', icon: '⊞' },
  { href: '/timetable', label: 'Timetable', icon: '📅' },
  { href: '/friends', label: 'Friends', icon: '👥' },
  { href: '/profile', label: 'Profile', icon: '👤' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function Sidebar() {
  const [expanded, setExpanded] = useState(false)
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

  // Check for unread messages
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

    // Initial check
    checkUnread()

    // Listen for any message changes (new messages or read status updates)
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
        () => {
          // Re-check unread count whenever any message changes
          checkUnread()
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  // Don't show sidebar on login/auth pages
  if (pathname === '/login' || pathname?.startsWith('/auth')) return null

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r z-40 flex flex-col transition-all duration-200 ${expanded ? 'w-56' : 'w-14'
          }`}
      >
        {/* Hamburger */}
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="h-14 flex items-center text-gray-500 hover:text-gray-800 flex-shrink-0 border-b w-full px-4 gap-3"
          title={expanded ? 'Collapse' : 'Expand'}
        >
          <span className="text-lg flex-shrink-0">☰</span>
          {expanded && <span className="text-sm font-semibold">Momentia</span>}
        </button>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map((item) => {
            const active = pathname === item.href
            const showDot = item.href === '/friends' && hasUnread
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setExpanded(false)}
                className={`flex items-center h-11 px-4 gap-3 text-sm transition hover:bg-gray-50 ${active ? 'text-black font-medium bg-gray-50' : 'text-gray-500'
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

          {/* Subjects section */}
          {expanded && (
            <div className="mt-2">
              <button
                onClick={() => setShowSubjects((prev) => !prev)}
                className="flex items-center w-full h-11 px-4 gap-3 text-sm text-gray-500 hover:bg-gray-50"
              >
                <span className="text-base flex-shrink-0">📚</span>
                <span className="flex-1 text-left truncate">Subjects</span>
                <span className="text-xs">{showSubjects ? '▲' : '▼'}</span>
              </button>
              {showSubjects && (
                <div className="pl-4 pb-2">
                  {subjects.length === 0 ? (
                    <p className="text-xs text-gray-400 px-4 py-2">No subjects yet</p>
                  ) : (
                    subjects.map((subject) => (
                      <Link
                        key={subject.id}
                        href={`/subject/${subject.id}`}
                        onClick={() => setExpanded(false)}
                        className={`flex items-center gap-2 px-4 py-2 text-xs rounded hover:bg-gray-50 ${pathname === `/subject/${subject.id}`
                          ? 'text-black font-medium'
                          : 'text-gray-500'
                          }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                        <span className="truncate">{subject.name}</span>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Subjects icon when collapsed */}
          {!expanded && (
            <button
              className="flex items-center justify-center w-full h-11 text-gray-500 hover:bg-gray-50"
              title="Subjects"
              onClick={() => setExpanded(true)}
            >
              <span className="text-base">📚</span>
            </button>
          )}
        </nav>

        {/* Sign out at bottom */}
        <div className="border-t py-2">
          <button
            onClick={handleSignOut}
            className="flex items-center h-11 px-4 gap-3 text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-50 w-full"
            title={!expanded ? 'Sign out' : undefined}
          >
            <span className="text-base flex-shrink-0">🚪</span>
            {expanded && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Overlay when expanded on small screens */}
      {expanded && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setExpanded(false)}
        />
      )}

      {/* Spacer so page content doesn't go under the sidebar */}
      <div className="w-14 flex-shrink-0" />
    </>
  )
}