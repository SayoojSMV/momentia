'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function TopicPage({ params }) {
  const { id, topicId } = use(params)
  const [topic, setTopic] = useState(null)
  const [nextTopic, setNextTopic] = useState(null)
  const [loading, setLoading] = useState(true)
  const [seconds, setSeconds] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [content, setContent] = useState(null)
  const [generatingContent, setGeneratingContent] = useState(false)
  const intervalRef = useRef(null)
  const savedSecondsRef = useRef(0)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
        return
      }

      // Fetch this topic
      supabase
        .from('topics')
        .select('*')
        .eq('id', topicId)
        .single()
        .then(({ data, error }) => {
          if (error || !data) {
            router.replace('/')
            return
          }
          setTopic(data)
          setSeconds(data.time_spent_seconds || 0)
          savedSecondsRef.current = data.time_spent_seconds || 0
          setCompleted(data.status === 'completed')
          setLoading(false)

          // Load existing content or generate it
          if (data.content) {
            setContent(data.content)
          } else {
            setGeneratingContent(true)
            fetch('/api/generate-content', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                topicId,
                topicName: data.name,
                subjectName: '', // will be fetched below
                difficulty: data.difficulty,
              }),
            })
              .then((r) => r.json())
              .then((result) => {
                if (result.content) setContent(result.content)
                setGeneratingContent(false)
              })
          }

          // Fetch subject name for content generation context
          supabase
            .from('units')
            .select('subject_id, subjects(name)')
            .eq('id', data.unit_id)
            .single()
            .then(({ data: unitData }) => {
              if (!unitData) return
              const subjectName = unitData.subjects?.name || ''

              if (!data.content) {
                setGeneratingContent(true)
                fetch('/api/generate-content', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    topicId,
                    topicName: data.name,
                    subjectName,
                    difficulty: data.difficulty,
                  }),
                })
                  .then((r) => r.json())
                  .then((result) => {
                    if (result.content) setContent(result.content)
                    setGeneratingContent(false)
                  })
              }
            })

          // Find the next topic in the same unit
          supabase
            .from('topics')
            .select('*')
            .eq('unit_id', data.unit_id)
            .gt('order_index', data.order_index)
            .order('order_index', { ascending: true })
            .limit(1)
            .single()
            .then(({ data: next }) => {
              if (next) setNextTopic(next)
            })
        })
    })
  }, [topicId, router])

  // Start the stopwatch when page loads, stop if already completed
  useEffect(() => {
    if (loading || completed) return

    intervalRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(intervalRef.current)
  }, [loading, completed])

  // Save time to Supabase every 10 seconds and on page leave
  useEffect(() => {
    if (!topic) return

    const saveProgress = async () => {
      await supabase
        .from('topics')
        .update({ time_spent_seconds: savedSecondsRef.current })
        .eq('id', topicId)
    }

    // Save every 10 seconds
    const saveInterval = setInterval(saveProgress, 10000)

    // Save when tab becomes hidden (user switches tabs or navigates away)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveProgress()
      }
    }

    // Save on browser close/refresh
    const handleBeforeUnload = () => {
      saveProgress()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(saveInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      saveProgress() // also try on React unmount
    }
  }, [topic, topicId])

  // Keep savedSecondsRef in sync with the live timer
  useEffect(() => {
    savedSecondsRef.current = seconds
  }, [seconds])

  const handleMarkComplete = async () => {
    clearInterval(intervalRef.current)

    await supabase
      .from('topics')
      .update({
        status: 'completed',
        time_spent_seconds: seconds,
      })
      .eq('id', topicId)

    setCompleted(true)
  }

  const formatTime = (s) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}h ${m}m ${sec}s`
    if (m > 0) return `${m}m ${sec}s`
    return `${sec}s`
  }

  if (loading) return null

  return (
    <main className="min-h-screen bg-gray-50 p-6 max-w-2xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.push(`/subject/${id}`)}
        className="text-sm text-gray-500 hover:text-gray-800 mb-4 inline-block"
      >
        ← Back to subject
      </button>

      {/* Topic header */}
      <div className="mb-6">
        <span className={`text-xs px-2 py-1 rounded-full ${topic.difficulty === 'easy' ? 'bg-gray-100 text-gray-500' :
          topic.difficulty === 'medium' ? 'bg-gray-200 text-gray-600' :
            'bg-gray-800 text-white'
          }`}>
          {topic.difficulty}
        </span>
        <h1 className="text-2xl font-semibold mt-2">{topic.name}</h1>
      </div>

      {/* Timer */}
      <div className="bg-white border rounded-lg p-6 mb-6 text-center">
        <p className="text-xs text-gray-400 mb-1">
          {completed ? 'Time spent' : 'Time studying'}
        </p>
        <p className="text-4xl font-mono font-semibold">{formatTime(seconds)}</p>
        {!completed && (
          <p className="text-xs text-gray-400 mt-2">Timer running...</p>
        )}
        {completed && (
          <p className="text-xs text-green-600 mt-2">✓ Completed</p>
        )}
      </div>

      {/* Content */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <p className="text-sm font-medium text-gray-700 mb-3">Study content</p>
        {generatingContent ? (
          <p className="text-gray-400 text-sm">Generating study content...</p>
        ) : content ? (
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{content}</p>
        ) : (
          <p className="text-gray-400 text-sm">Could not generate content. Try refreshing.</p>
        )}
      </div>

      {/* Actions */}
      {!completed ? (
        <button
          onClick={handleMarkComplete}
          className="w-full bg-black text-white py-3 rounded-lg text-sm font-medium hover:bg-gray-800"
        >
          Mark as complete
        </button>
      ) : (
        <div className="space-y-3">
          <div className="w-full bg-gray-100 text-gray-500 py-3 rounded-lg text-sm font-medium text-center">
            ✓ Topic completed
          </div>
          {nextTopic ? (
            <button
              onClick={() => router.push(`/subject/${id}/topic/${nextTopic.id}`)}
              className="w-full border py-3 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Next: {nextTopic.name} →
            </button>
          ) : (
            <button
              onClick={() => router.push(`/subject/${id}`)}
              className="w-full border py-3 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              ← Back to subject
            </button>
          )}
        </div>
      )}
    </main>
  )
}