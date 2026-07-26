'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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
        <div
          className="fixed bottom-20 right-6 w-80 bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl shadow-xl flex flex-col z-50"
          style={{ height: '460px' }}
        >
          {/* Header */}
          <div className="border-b dark:border-gray-700 px-4 py-3 rounded-t-xl bg-black text-white">
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
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none
                      prose-p:my-1 prose-p:leading-relaxed
                      prose-headings:font-semibold prose-headings:my-2
                      prose-code:bg-gray-200 prose-code:dark:bg-gray-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
                      prose-pre:bg-gray-200 prose-pre:dark:bg-gray-700 prose-pre:rounded prose-pre:p-2 prose-pre:text-xs
                      prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5
                      prose-table:text-xs prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1
                      prose-th:border prose-th:border-gray-300 prose-th:dark:border-gray-600
                      prose-td:border prose-td:border-gray-300 prose-td:dark:border-gray-600
                      prose-strong:font-semibold
                      prose-a:text-blue-600 prose-a:dark:text-blue-400">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t dark:border-gray-700 p-3 flex gap-2 items-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-lg flex-shrink-0"
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
              className="flex-1 text-sm border dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-black bg-white dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
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