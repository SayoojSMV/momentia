'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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
    <div className="w-full space-y-6">
      {/* Back button */}
      <div>
        <button
          onClick={() => router.push(`/subject/${id}`)}
          className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white inline-flex items-center gap-1 transition"
        >
          ← Back to subject
        </button>
      </div>

      {/* Topic Header & Timer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b dark:border-gray-800">
        <div className="space-y-1.5">
          <span className={`inline-block text-[11px] font-medium tracking-wide uppercase px-2.5 py-0.5 rounded-md ${
            topic.difficulty === 'easy'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
              : topic.difficulty === 'medium'
              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50'
          }`}>
            {topic.difficulty}
          </span>
          <h1 className="text-2xl font-semibold dark:text-white">{topic.name}</h1>
        </div>

        {/* Compact Timer */}
        <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-start gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition ${
            completed
              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300'
              : paused
              ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-300'
              : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white'
          }`}>
            <span className="font-mono text-base font-semibold">
              {formatTime(seconds)}
            </span>
            {completed ? (
              <span className="text-xs font-semibold">✓</span>
            ) : (
              <button
                onClick={() => setPaused((prev) => !prev)}
                className="text-xs text-gray-400 hover:text-black dark:hover:text-white ml-1 transition"
                title={paused ? 'Resume timer' : 'Pause timer'}
              >
                {paused ? '▶' : '⏸'}
              </button>
            )}
          </div>
          {!completed && (
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              {paused ? 'Timer paused' : 'Timer active'}
            </span>
          )}
        </div>
      </div>

      {/* Content Card */}
      <section className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-6">
        <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
          Study Content
        </h2>

        {generatingContent ? (
          <div className="py-12 text-center space-y-2">
            <div className="inline-block animate-spin text-gray-400">⏳</div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Generating structured study content for this topic...</p>
          </div>
        ) : content ? (
          <div className="prose prose-sm dark:prose-invert max-w-none
            prose-headings:font-semibold
            prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
            prose-code:bg-gray-100 prose-code:dark:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-gray-900 dark:prose-pre:bg-gray-950 prose-pre:text-gray-100 prose-pre:rounded-xl prose-pre:p-4
            prose-table:border-collapse prose-th:border prose-th:border-gray-200 prose-th:dark:border-gray-800 prose-th:px-3 prose-th:py-2 prose-th:bg-gray-50 prose-th:dark:bg-gray-800/50
            prose-td:border prose-td:border-gray-200 prose-td:dark:border-gray-800 prose-td:px-3 prose-td:py-2
            prose-a:text-black dark:prose-a:text-white prose-a:underline
            prose-blockquote:border-l-black dark:prose-blockquote:border-l-white">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500 py-4">
            Could not load or generate content. Please try refreshing the page.
          </p>
        )}
      </section>

      {/* Footer Actions */}
      <div className="pt-2">
        {!completed ? (
          <button
            onClick={handleMarkComplete}
            className="w-full bg-black text-white dark:bg-white dark:text-black py-3 rounded-xl text-sm font-medium hover:opacity-90 transition"
          >
            Mark as complete
          </button>
        ) : (
          <div className="space-y-3">
            <div className="w-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 py-3 rounded-xl text-sm font-medium text-center">
              ✓ Topic completed
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {nextTopic ? (
                <button
                  onClick={() => router.push(`/subject/${id}/topic/${nextTopic.id}`)}
                  className="flex-1 bg-black text-white dark:bg-white dark:text-black py-3 rounded-xl text-sm font-medium hover:opacity-90 transition"
                >
                  Next topic: {nextTopic.name} →
                </button>
              ) : (
                <button
                  onClick={() => router.push(`/subject/${id}`)}
                  className="flex-1 bg-black text-white dark:bg-white dark:text-black py-3 rounded-xl text-sm font-medium hover:opacity-90 transition"
                >
                  ← Return to subject
                </button>
              )}

              <button
                onClick={handleMarkIncomplete}
                className="px-4 py-3 border dark:border-gray-800 rounded-xl text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Mark as incomplete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}