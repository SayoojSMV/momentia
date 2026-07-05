'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Chatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m your Momentia study assistant. Ask me anything about your subjects or studying.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user)
    })
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (content) => {
    if (!content.trim() || loading) return

    const userMessage = { role: 'user', content: content.trim() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: updatedMessages,
        userId: user?.id,
      }),
    })

    const result = await response.json()

    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: result.reply || 'Sorry, something went wrong.' },
    ])
    setLoading(false)
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Convert file to base64 for sending as context
    const reader = new FileReader()
    reader.onload = async () => {
      const content = `[Uploaded file: ${file.name}]\n\nPlease analyze this file and help me understand the content.`
      await handleSend(content)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-black text-white rounded-full shadow-lg flex items-center justify-center text-xl hover:bg-gray-800 z-50"
      >
        {open ? '✕' : '💬'}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-6 w-80 bg-white border rounded-xl shadow-xl flex flex-col z-50" style={{ height: '460px' }}>
          {/* Header */}
          <div className="border-b px-4 py-3 rounded-t-xl bg-black text-white">
            <p className="text-sm font-medium">Momentia Assistant</p>
            <p className="text-xs text-gray-400">Ask me anything</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                    msg.role === 'user'
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-3 py-2 rounded-lg text-sm text-gray-500">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-3 flex gap-2 items-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-400 hover:text-gray-700 text-lg flex-shrink-0"
              title="Upload file"
            >
              📎
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.txt,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
              placeholder="Ask anything..."
              className="flex-1 text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-black"
            />
            <button
              onClick={() => handleSend(input)}
              disabled={loading}
              className="bg-black text-white text-sm px-3 py-1 rounded hover:bg-gray-800 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  )
}