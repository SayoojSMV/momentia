'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function FriendsPage() {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [friends, setFriends] = useState([])
    const [pendingReceived, setPendingReceived] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [searching, setSearching] = useState(false)
    const [selectedFriend, setSelectedFriend] = useState(null)
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [unreadCounts, setUnreadCounts] = useState({})
    const [suggestions, setSuggestions] = useState([])
    const messagesEndRef = useRef(null)
    const router = useRouter()

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) { router.replace('/login'); return }
            setUser(session.user)
            fetchFriends(session.user.id)
            fetchPendingRequests(session.user.id)
            fetchUnreadCounts(session.user.id)
            fetchSuggestions(session.user.id)
            setLoading(false)
        })
    }, [router])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    useEffect(() => {
        if (!user || !selectedFriend) return
        const channel = supabase
            .channel(`incoming-${user.id}-${selectedFriend.id}`)
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'messages',
                filter: `sender_id=eq.${selectedFriend.id}`,
            }, (payload) => {
                const msg = payload.new
                if (msg.receiver_id === user.id) {
                    setMessages((prev) => [...prev, msg])
                    supabase.from('messages').update({ is_read: true }).eq('id', msg.id)
                }
            })
            .subscribe()
        return () => supabase.removeChannel(channel)
    }, [user, selectedFriend])

    const fetchFriends = async (userId) => {
        const { data, error } = await supabase
            .from('friend_requests').select('sender_id, receiver_id')
            .eq('status', 'accepted').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        if (error || !data) return
        const friendIds = data.map((r) => r.sender_id === userId ? r.receiver_id : r.sender_id)
        if (!friendIds.length) return
        const { data: profiles } = await supabase
            .from('profiles').select('id, full_name, avatar_url').in('id', friendIds)
        if (profiles) setFriends(profiles)
    }

    const fetchPendingRequests = async (userId) => {
        const { data, error } = await supabase
            .from('friend_requests').select('id, sender_id')
            .eq('receiver_id', userId).eq('status', 'pending')
        if (error || !data?.length) return
        const senderIds = data.map((r) => r.sender_id)
        const { data: profiles } = await supabase
            .from('profiles').select('id, full_name, avatar_url').in('id', senderIds)
        if (profiles) {
            setPendingReceived(profiles.map((p) => ({
                ...p, requestId: data.find((r) => r.sender_id === p.id)?.id,
            })))
        }
    }

    const fetchUnreadCounts = async (userId) => {
        const { data, error } = await supabase
            .from('messages').select('sender_id')
            .eq('receiver_id', userId).eq('is_read', false)
        if (error || !data) return
        const counts = {}
        data.forEach((msg) => { counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1 })
        setUnreadCounts(counts)
    }

    const fetchSuggestions = async (userId) => {
        const { data: requests } = await supabase
            .from('friend_requests').select('sender_id, receiver_id')
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        const excludeIds = new Set([userId])
        ;(requests || []).forEach((r) => { excludeIds.add(r.sender_id); excludeIds.add(r.receiver_id) })
        const { data, error } = await supabase
            .from('profiles').select('id, full_name, avatar_url')
            .not('id', 'in', `(${[...excludeIds].join(',')})`)
            .order('created_at', { ascending: false }).limit(5)
        if (!error && data) setSuggestions(data)
    }

    const handleSearch = async () => {
        if (!searchQuery.trim()) return
        setSearching(true)
        const { data, error } = await supabase
            .from('profiles').select('id, full_name, avatar_url')
            .ilike('full_name', `%${searchQuery}%`).neq('id', user.id).limit(10)
        if (!error) setSearchResults(data)
        setSearching(false)
    }

    const handleLiveSearch = async (value) => {
        if (!value.trim()) { setSearchResults([]); return }
        const { data, error } = await supabase
            .from('profiles').select('id, full_name, avatar_url')
            .ilike('full_name', `%${value.trim()}%`).neq('id', user.id).limit(5)
        if (!error) setSearchResults(data)
    }

    const handleSendRequest = async (receiverId) => {
        await supabase.from('friend_requests').insert({ sender_id: user.id, receiver_id: receiverId })
        setSearchResults((prev) => prev.filter((p) => p.id !== receiverId))
    }

    const handleRespondToRequest = async (requestId, senderId, accept) => {
        await supabase.from('friend_requests')
            .update({ status: accept ? 'accepted' : 'declined' }).eq('id', requestId)
        setPendingReceived((prev) => prev.filter((r) => r.requestId !== requestId))
        if (accept) {
            const { data: profile } = await supabase
                .from('profiles').select('id, full_name, avatar_url').eq('id', senderId).single()
            if (profile) setFriends((prev) => [...prev, profile])
        }
    }

    const handleSelectFriend = async (friend) => {
        setSelectedFriend(friend)
        await supabase.from('messages').update({ is_read: true })
            .eq('receiver_id', user.id).eq('sender_id', friend.id).eq('is_read', false)
        setUnreadCounts((prev) => { const updated = { ...prev }; delete updated[friend.id]; return updated })
        const { data, error } = await supabase.from('messages').select('*')
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${user.id})`)
            .order('created_at', { ascending: true })
        if (!error) setMessages(data)
    }

    const handleRemoveFriend = async (friendId) => {
        const confirmed = window.confirm('Remove this friend?')
        if (!confirmed) return
        await supabase.from('friend_requests').delete()
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
        setFriends((prev) => prev.filter((f) => f.id !== friendId))
        if (selectedFriend?.id === friendId) { setSelectedFriend(null); setMessages([]) }
    }

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedFriend) return
        const content = newMessage.trim()
        setNewMessage('')
        const { data, error } = await supabase.from('messages')
            .insert({ sender_id: user.id, receiver_id: selectedFriend.id, content })
            .select().single()
        if (!error && data) setMessages((prev) => [...prev, data])
    }

    if (loading) return null

    return (
        <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
            <h1 className="text-2xl font-semibold mb-6 dark:text-white">Friends</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                    {/* Search */}
                    <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-4">
                        <p className="text-sm font-medium mb-3 dark:text-white">Find study mates</p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); handleLiveSearch(e.target.value) }}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Search by name"
                                className="flex-1 border dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black bg-white dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                            />
                            <button
                                onClick={handleSearch}
                                disabled={searching}
                                className="bg-black text-white text-sm px-3 py-2 rounded hover:bg-gray-800"
                            >
                                Search
                            </button>
                        </div>
                        {searchResults.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {searchResults.map((profile) => (
                                    <div key={profile.id} className="flex items-center justify-between py-2">
                                        <p className="text-sm dark:text-gray-300">{profile.full_name}</p>
                                        <button
                                            onClick={() => handleSendRequest(profile.id)}
                                            className="text-xs border dark:border-gray-600 rounded px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300"
                                        >
                                            Add
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pending requests */}
                    {pendingReceived.length > 0 && (
                        <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-4">
                            <p className="text-sm font-medium mb-3 dark:text-white">Friend requests</p>
                            <div className="space-y-3">
                                {pendingReceived.map((req) => (
                                    <div key={req.requestId} className="flex items-center justify-between">
                                        <p className="text-sm dark:text-gray-300">{req.full_name}</p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleRespondToRequest(req.requestId, req.id, true)}
                                                className="text-xs bg-black text-white px-2 py-1 rounded"
                                            >
                                                Accept
                                            </button>
                                            <button
                                                onClick={() => handleRespondToRequest(req.requestId, req.id, false)}
                                                className="text-xs border dark:border-gray-600 px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300"
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Friends list */}
                    <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-4">
                        <p className="text-sm font-medium mb-3 dark:text-white">Study mates</p>
                        {friends.length === 0 ? (
                            <div>
                                <p className="text-gray-400 dark:text-gray-500 text-sm mb-3">No friends yet — search above.</p>
                                {suggestions.length > 0 && (
                                    <div>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Suggested</p>
                                        <div className="space-y-2">
                                            {suggestions.map((profile) => (
                                                <div key={profile.id} className="flex items-center justify-between py-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium flex-shrink-0 dark:text-gray-300">
                                                            {profile.avatar_url ? (
                                                                <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full rounded-full object-cover" />
                                                            ) : (
                                                                profile.full_name?.[0] || '?'
                                                            )}
                                                        </div>
                                                        <p className="text-sm dark:text-gray-300">{profile.full_name}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => { handleSendRequest(profile.id); setSuggestions((prev) => prev.filter((s) => s.id !== profile.id)) }}
                                                        className="text-xs border dark:border-gray-600 rounded px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300"
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {friends.map((friend) => (
                                    <div
                                        key={friend.id}
                                        onClick={() => handleSelectFriend(friend)}
                                        className={`flex items-center gap-3 py-2 px-2 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                                            selectedFriend?.id === friend.id ? 'bg-gray-100 dark:bg-gray-800' : ''
                                        }`}
                                    >
                                        <div className="relative">
                                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium dark:text-gray-300">
                                                {friend.full_name?.[0] || '?'}
                                            </div>
                                            {unreadCounts[friend.id] > 0 && (
                                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                                                    {unreadCounts[friend.id] > 9 ? '9+' : unreadCounts[friend.id]}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm flex-1 dark:text-gray-300">{friend.full_name}</p>
                                        {unreadCounts[friend.id] > 0 && (
                                            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat panel */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-lg h-full flex flex-col" style={{ minHeight: '500px' }}>
                        {!selectedFriend ? (
                            <div className="flex-1 flex items-center justify-center">
                                <p className="text-gray-400 dark:text-gray-500 text-sm">Select a friend to start chatting</p>
                            </div>
                        ) : (
                            <>
                                <div className="border-b dark:border-gray-700 px-4 py-3 flex items-center justify-between">
                                    <p className="font-medium text-sm dark:text-white">{selectedFriend.full_name}</p>
                                    <button
                                        onClick={() => handleRemoveFriend(selectedFriend.id)}
                                        className="text-xs text-gray-400 hover:text-red-400"
                                    >
                                        Remove friend
                                    </button>
                                </div>

                                <div className="overflow-y-auto p-4 space-y-3" style={{ height: '360px' }}>
                                    {messages.length === 0 && (
                                        <p className="text-gray-400 dark:text-gray-500 text-sm text-center">No messages yet — say hello!</p>
                                    )}
                                    {messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`flex flex-col ${msg.sender_id === user.id ? 'items-end' : 'items-start'}`}
                                        >
                                            <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                                                msg.sender_id === user.id
                                                    ? 'bg-black text-white'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                                            }`}>
                                                {msg.content}
                                            </div>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 px-1">
                                                {new Date(msg.created_at).toLocaleTimeString('en-IN', {
                                                    hour: '2-digit', minute: '2-digit', hour12: true,
                                                })}
                                            </p>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>

                                <div className="border-t dark:border-gray-700 px-4 py-3 flex gap-2">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="Type a message..."
                                        className="flex-1 border dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black bg-white dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        className="bg-black text-white text-sm px-4 py-2 rounded hover:bg-gray-800"
                                    >
                                        Send
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </main>
    )
}