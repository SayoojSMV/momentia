'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
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

      // Fetch recent notifications
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30) // Increased limit to gather context for grouping

      if (!error && data) {
        const uniqueData = data.filter((item, index, self) =>
          index === self.findIndex((t) => t.id === item.id)
        )
        setNotifications(uniqueData)
        setUnreadCount(uniqueData.filter((n) => !n.is_read).length)
      }

      // Unique channel name per mount to prevent cached channel registration collisions
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

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Group notifications by key (Chat link/actor or notification type)
  const groupedNotifications = useMemo(() => {
    const groups = []

    notifications.forEach((item) => {
      // Group key: for chats, group by link (e.g. /friends?chat=SENDER_ID). Otherwise group by item ID.
      const groupKey = item.link && (item.type === 'chat' || item.type === 'chat_message')
        ? item.link
        : item.id

      let group = groups.find((g) => g.key === groupKey)

      if (!group) {
        group = {
          key: groupKey,
          title: item.title,
          type: item.type,
          link: item.link,
          items: [],
          hasUnread: false,
          latestTime: item.created_at,
        }
        groups.push(group)
      }

      group.items.push(item)
      if (!item.is_read) group.hasUnread = true

      // Ensure group maintains the timestamp of the newest message
      if (new Date(item.created_at) > new Date(group.latestTime)) {
        group.latestTime = item.created_at
      }
    })

    // Sort groups so the ones with newest messages show up on top
    return groups.sort((a, b) => new Date(b.latestTime) - new Date(a.latestTime))
  }, [notifications])

  const handleGroupClick = async (group) => {
    const unreadItemIds = group.items.filter((item) => !item.is_read).map((item) => item.id)

    if (unreadItemIds.length > 0) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadItemIds)

      if (!error) {
        setNotifications((prev) =>
          prev.map((n) => (unreadItemIds.includes(n.id) ? { ...n, is_read: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - unreadItemIds.length))
      }
    }

    setIsOpen(false)

    if (group.link) {
      router.push(group.link)
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
      {/* Bell Icon Button */}
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

      {/* Notifications Popover */}
      {isOpen && (
        <div className="absolute top-12 right-0 w-80 sm:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
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

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
            {groupedNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">No notifications yet</p>
              </div>
            ) : (
              groupedNotifications.map((group) => {
                const unreadInGroupCount = group.items.filter((i) => !i.is_read).length
                // Grab up to the last 5 messages (oldest to newest for stacked order)
                const stackedItems = group.items.slice(0, 5).reverse()

                return (
                  <div
                    key={group.key}
                    onClick={() => handleGroupClick(group)}
                    className={`p-3.5 text-xs transition cursor-pointer flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${group.hasUnread
                        ? 'bg-blue-50/40 dark:bg-blue-950/20 text-gray-900 dark:text-white'
                        : 'bg-transparent text-gray-600 dark:text-gray-400'
                      }`}
                  >
                    <span className="text-base mt-0.5 flex-shrink-0">
                      {getTypeIcon(group.type)}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <p className={`truncate ${group.hasUnread ? 'font-semibold' : 'font-medium'}`}>
                            {group.title}
                          </p>
                          {group.items.length > 1 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold flex-shrink-0">
                              {group.items.length}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 ml-2 flex-shrink-0">
                          {new Date(group.latestTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Stacked Preview for Messages */}
                      <div className="space-y-1">
                        {stackedItems.map((msg, idx) => (
                          <div
                            key={msg.id || idx}
                            className={`p-1.5 rounded-lg text-[11px] leading-relaxed transition ${!msg.is_read
                                ? 'bg-white dark:bg-gray-800/90 text-gray-900 dark:text-gray-100 shadow-sm border border-blue-100 dark:border-blue-900/40'
                                : 'bg-gray-100/60 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400'
                              }`}
                          >
                            <p className="line-clamp-2">{msg.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {group.hasUnread && (
                      <span className="h-2 w-2 rounded-full bg-blue-600 mt-1 flex-shrink-0" />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}