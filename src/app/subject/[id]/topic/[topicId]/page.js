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
  const [paused, setPaused] = useState(false)
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

          if (data.content) {
            setContent(data.content)
          } else {
            supabase
              .from('units')
              .select('subject_id, subjects(name)')
              .eq('id', data.unit_id)
              .single()
              .then(({ data: unitData }) => {
                const subjectName = unitData?.subjects?.name || ''
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
              })
          }

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

  useEffect(() => {
    if (loading || completed || paused) {
      clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [loading, completed, paused])

  useEffect(() => {
    if (!topic) return

    const saveProgress = async () => {
      await supabase
        .from('topics')
        .update({ time_spent_seconds: savedSecondsRef.current })
        .eq('id', topicId)
    }

    const saveInterval = setInterval(saveProgress, 10000)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveProgress()
    }
    const handleBeforeUnload = () => saveProgress()

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(saveInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      saveProgress()
    }
  }, [topic, topicId])

  useEffect(() => {
    savedSecondsRef.current = seconds
  }, [seconds])

  const handleMarkComplete = async () => {
    clearInterval(intervalRef.current)
    await supabase
      .from('topics')
      .update({ status: 'completed', time_spent_seconds: seconds })
      .eq('id', topicId)
    setCompleted(true)
  }

  const handleMarkIncomplete = async () => {
    await supabase
      .from('topics')
      .update({ status: 'not_started' })
      .eq('id', topicId)
    setCompleted(false)
    setPaused(false)
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
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 max-w-2xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.push(`/subject/${id}`)}
        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white mb-4 inline-block"
      >
        ← Back to subject
      </button>

      {/* Topic header with compact timer */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <span className={`text-xs px-2 py-1 rounded-full ${
            topic.difficulty === 'easy'
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              : topic.difficulty === 'medium'
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              : 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
          }`}>
            {topic.difficulty}
          </span>
          <h1 className="text-2xl font-semibold mt-2 dark:text-white">{topic.name}</h1>
        </div>

        {/* Compact timer */}
        <div className="flex flex-col items-end gap-2 ml-4 flex-shrink-0">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
            completed
              ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
              : paused
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
              : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
          }`}>
            <span className="font-mono text-lg font-semibold dark:text-white">
              {formatTime(seconds)}
            </span>
            {completed ? (
              <span className="text-xs text-green-600">✓</span>
            ) : (
              <button
                onClick={() => setPaused((prev) => !prev)}
                className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 ml-1"
                title={paused ? 'Resume timer' : 'Pause timer'}
              >
                {paused ? '▶' : '⏸'}
              </button>
            )}
          </div>
          {!completed && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {paused ? 'Paused' : 'Timer running'}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-6 mb-6">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Study content</p>
        {generatingContent ? (
          <p className="text-gray-400 dark:text-gray-500 text-sm">Generating study content...</p>
        ) : content ? (
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{content}</p>
        ) : (
          <p className="text-gray-400 dark:text-gray-500 text-sm">Could not generate content. Try refreshing.</p>
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
          <div className="w-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 py-3 rounded-lg text-sm font-medium text-center">
            ✓ Topic completed
          </div>
          <button
            onClick={handleMarkIncomplete}
            className="w-full border dark:border-gray-600 border-gray-300 py-2 rounded-lg text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Mark as incomplete
          </button>
          {nextTopic ? (
            <button
              onClick={() => router.push(`/subject/${id}/topic/${nextTopic.id}`)}
              className="w-full border dark:border-gray-600 py-3 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300"
            >
              Next: {nextTopic.name} →
            </button>
          ) : (
            <button
              onClick={() => router.push(`/subject/${id}`)}
              className="w-full border dark:border-gray-600 py-3 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300"
            >
              ← Back to subject
            </button>
          )}
        </div>
      )}
    </main>
  )
}