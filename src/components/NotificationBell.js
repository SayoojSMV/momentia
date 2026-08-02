'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [userId, setUserId] = useState(null)
  const dropdownRef = useRef(null)
  const router = useRouter()

  useEffect(() => {
    let activeChannel = null

    const initNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)

      // Fetch initial notifications
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (!error && data) {
        const uniqueData = data.filter((item, index, self) =>
          index === self.findIndex((t) => t.id === item.id)
        )
        setNotifications(uniqueData)
        setUnreadCount(uniqueData.filter((n) => !n.is_read).length)
      }

      // Append Date.now() to ensure a clean channel identity across page refreshes
      const channelName = `notifications_${user.id}_${Date.now()}`

      activeChannel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotif = payload.new

            setNotifications((prev) => {
              if (prev.some((item) => item.id === newNotif.id)) {
                return prev
              }
              return [newNotif, ...prev]
            })

            setUnreadCount((prev) => prev + 1)
          }
        )
        .subscribe()
    }

    initNotifications()

    return () => {
      if (activeChannel) {
        supabase.removeChannel(activeChannel)
      }
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNotificationClick = async (item) => {
    if (!item.is_read) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', item.id)

      if (!error) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    }

    setIsOpen(false)

    if (item.link) {
      router.push(item.link)
    }
  }

  const markAllAsRead = async () => {
    if (!userId) return

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'study_reminder':
        return '⏰'
      case 'exam_alert':
        return '📅'
      case 'chat':
      case 'chat_message':
        return '💬'
      case 'system':
        return '⚙️'
      default:
        return '🔔'
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
        aria-label="Notifications"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-12 right-0 w-80 sm:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="p-3.5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-black dark:bg-white text-white dark:text-black px-2 py-0.5 rounded-full font-medium">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">No notifications yet</p>
              </div>
            ) : (
              notifications.map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 text-xs transition cursor-pointer flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                    item.is_read
                      ? 'bg-transparent text-gray-600 dark:text-gray-400'
                      : 'bg-blue-50/40 dark:bg-blue-950/20 text-gray-900 dark:text-white'
                  }`}
                >
                  <span className="text-base mt-0.5 flex-shrink-0">
                    {getTypeIcon(item.type)}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`truncate ${!item.is_read ? 'font-semibold' : 'font-medium'}`}>
                        {item.title}
                      </p>
                      <span className="text-[10px] text-gray-400 ml-2 flex-shrink-0">
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                  </div>

                  {!item.is_read && (
                    <span className="h-2 w-2 rounded-full bg-blue-600 mt-1 flex-shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}