'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SubjectPage({ params }) {
  const { id } = use(params)
  const [materials, setMaterials] = useState([])
  const [uploading, setUploading] = useState(false)
  const [subject, setSubject] = useState(null)
  const [units, setUnits] = useState([])
  const [expandedUnit, setExpandedUnit] = useState(null)
  const [topics, setTopics] = useState({})
  const [loading, setLoading] = useState(true)
  const [showUnitInput, setShowUnitInput] = useState(false)
  const [newUnitName, setNewUnitName] = useState('')
  const [showTopicInput, setShowTopicInput] = useState(null)
  const [newTopicName, setNewTopicName] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [allTopics, setAllTopics] = useState([])
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
        return
      }

      supabase
        .from('subjects')
        .select('*')
        .eq('id', id)
        .single()
        .then(({ data, error }) => {
          if (error || !data) {
            router.replace('/')
            return
          }
          setSubject(data)
        })

      supabase
        .from('units')
        .select('*')
        .eq('subject_id', id)
        .order('order_index', { ascending: true })
        .then(({ data, error }) => {
          if (!error) setUnits(data)
          setLoading(false)
        })

      supabase
        .from('materials')
        .select('*')
        .eq('subject_id', id)
        .then(({ data, error }) => {
          if (!error) setMaterials(data)
        })
    })
  }, [id, router])

  const handleExpandUnit = async (unitId) => {
    if (expandedUnit === unitId) {
      setExpandedUnit(null)
      return
    }
    setExpandedUnit(unitId)
    if (topics[unitId]) return
    const { data, error } = await supabase
      .from('topics')
      .select('*')
      .eq('unit_id', unitId)
      .order('order_index', { ascending: true })
    if (!error) setTopics((prev) => ({ ...prev, [unitId]: data }))
  }

  const handleAddUnit = async () => {
    if (!newUnitName.trim()) return
    const { data, error } = await supabase
      .from('units')
      .insert({ subject_id: id, name: newUnitName.trim(), order_index: units.length })
      .select()
      .single()
    if (!error) {
      setUnits((prev) => [...prev, data])
      setNewUnitName('')
      setShowUnitInput(false)
    }
  }

  const handleAddTopic = async (unitId) => {
    if (!newTopicName.trim()) return
    const existingTopics = topics[unitId] || []
    const { data, error } = await supabase
      .from('topics')
      .insert({ unit_id: unitId, name: newTopicName.trim(), order_index: existingTopics.length })
      .select()
      .single()
    if (!error) {
      setTopics((prev) => ({ ...prev, [unitId]: [...existingTopics, data] }))
      setNewTopicName('')
      setShowTopicInput(null)
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session.user.id
    const filePath = `${userId}/${id}/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage.from('materials').upload(filePath, file)
    if (uploadError) { console.error(uploadError); setUploading(false); return }
    const { data, error: dbError } = await supabase
      .from('materials')
      .insert({ subject_id: id, file_name: file.name, storage_path: filePath, file_type: file.type })
      .select()
      .single()
    if (!dbError) setMaterials((prev) => [...prev, data])
    setUploading(false)
  }

  const handleGenerateRoadmap = async () => {
    setGenerating(true)
    setGenerateError(null)
    const response = await fetch('/api/generate-roadmap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectId: id, subjectName: subject.name, materials }),
    })
    const result = await response.json()
    if (!response.ok || result.error) {
      setGenerateError(result.error || 'Something went wrong.')
      setGenerating(false)
      return
    }
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('subject_id', id)
      .order('order_index', { ascending: true })
    if (!error) { setUnits(data); setTopics({}); setExpandedUnit(null) }
    setGenerating(false)
  }

  const handleSearch = async (value) => {
    setSearchQuery(value)
    if (!value.trim()) { setAllTopics([]); return }
    const { data, error } = await supabase
      .from('topics')
      .select('*, units!inner(subject_id, name)')
      .eq('units.subject_id', id)
      .ilike('name', `%${value.trim()}%`)
      .order('order_index', { ascending: true })
    if (!error) setAllTopics(data)
  }

  if (loading) return null

  return (
    <div className="w-full space-y-6">
      {/* Back Button & Header */}
      <div>
        <button
          onClick={() => router.push('/')}
          className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white mb-2 inline-flex items-center gap-1 transition"
        >
          ← Back to dashboard
        </button>
        <p className="text-xs text-gray-400 dark:text-gray-500 uppercase font-medium tracking-wider">
          {subject?.category?.replace('_', ' ')}
        </p>
        <h1 className="text-2xl font-semibold dark:text-white mt-0.5">{subject?.name}</h1>
        {subject?.exam_date && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Exam Scheduled: <span className="font-medium text-gray-700 dark:text-gray-300">{new Date(subject.exam_date).toLocaleDateString()}</span>
          </p>
        )}
      </div>

      {/* Materials */}
      <section className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold dark:text-white">Study Materials</h2>
          <label className={`text-xs font-medium px-3 py-1.5 rounded-md cursor-pointer border dark:border-gray-800 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            {uploading ? 'Uploading...' : '+ Upload file'}
            <input
              type="file"
              accept=".pdf,.pptx,.docx,.txt,.png,.jpg,.jpeg"
              onChange={handleUpload}
              className="hidden"
            />
          </label>
        </div>
        {materials.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 text-xs">No materials uploaded yet.</p>
        ) : (
          <ul className="space-y-2">
            {materials.map((m) => (
              <li key={m.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-md border dark:border-gray-800">
                <span className="text-gray-400">📄</span>
                <span className="truncate flex-1">{m.file_name}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Generate roadmap */}
      <div>
        <button
          onClick={handleGenerateRoadmap}
          disabled={generating}
          className={`w-full py-3 rounded-xl text-sm font-medium border transition ${
            generating
              ? 'opacity-50 cursor-not-allowed bg-white dark:bg-gray-900 text-gray-400 dark:border-gray-800'
              : materials.length > 0
              ? 'bg-black text-white hover:opacity-90 border-black dark:bg-white dark:text-black dark:border-white'
              : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          {generating
            ? 'Generating roadmap...'
            : materials.length > 0
            ? '✨ Generate roadmap from materials'
            : '✨ Generate roadmap from subject name'}
        </button>
        {materials.length === 0 && !generating && (
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-2 text-center">
            No materials uploaded — roadmap will be generated based on the subject name only.
          </p>
        )}
        {generateError && (
          <p className="text-red-500 text-xs mt-2 text-center">{generateError}</p>
        )}
      </div>

      {/* Topic search */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="🔍 Search topics..."
          className="w-full border dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white bg-white dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
        />
        {searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl mt-2 shadow-xl z-20 max-h-64 overflow-y-auto">
            {allTopics.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 px-4 py-3">No topics found</p>
            ) : (
              allTopics.map((topic) => (
                <div
                  key={topic.id}
                  onClick={() => router.push(`/subject/${id}/topic/${topic.id}`)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer border-b dark:border-gray-800 last:border-0 transition"
                >
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    topic.status === 'completed' ? 'bg-black dark:bg-white' :
                    topic.status === 'in_progress' ? 'bg-amber-500' :
                    'bg-gray-200 dark:bg-gray-700'
                  }`} />
                  <div>
                    <p className="text-sm font-medium dark:text-white">{topic.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{topic.units?.name}</p>
                  </div>
                  <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 capitalize">
                    {topic.difficulty}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Units Accordion */}
      <div className="space-y-3">
        {units.length === 0 && (
          <p className="text-gray-400 dark:text-gray-500 text-xs text-center py-4">
            No units yet — add one below to get started.
          </p>
        )}
        {units.map((unit) => (
          <div key={unit.id} className="border dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 overflow-hidden">
            <button
              onClick={() => handleExpandUnit(unit.id)}
              className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition"
            >
              <span className="font-medium text-sm dark:text-white">{unit.name}</span>
              <span className="text-gray-400 dark:text-gray-500 text-xs">
                {expandedUnit === unit.id ? '▲' : '▼'}
              </span>
            </button>

            {expandedUnit === unit.id && (
              <div className="border-t dark:border-gray-800 px-5 py-4 space-y-2 bg-gray-50/30 dark:bg-gray-900/40">
                {(topics[unit.id] || []).length === 0 && (
                  <p className="text-gray-400 dark:text-gray-500 text-xs">No topics added yet.</p>
                )}
                {(topics[unit.id] || []).map((topic) => (
                  <div
                    key={topic.id}
                    onClick={() => router.push(`/subject/${id}/topic/${topic.id}`)}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-gray-800 hover:bg-white dark:hover:bg-gray-800 cursor-pointer transition"
                  >
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      topic.status === 'completed' ? 'bg-black dark:bg-white' :
                      topic.status === 'in_progress' ? 'bg-amber-500' :
                      'bg-gray-200 dark:bg-gray-700'
                    }`} />
                    <span className="text-xs font-medium dark:text-gray-200">{topic.name}</span>
                    <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 capitalize">
                      {topic.difficulty}
                    </span>
                  </div>
                ))}

                {showTopicInput === unit.id ? (
                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      value={newTopicName}
                      onChange={(e) => setNewTopicName(e.target.value)}
                      placeholder="Topic name"
                      className="flex-1 border dark:border-gray-800 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white bg-white dark:bg-gray-800 dark:text-white"
                    />
                    <button
                      onClick={() => handleAddTopic(unit.id)}
                      className="text-xs bg-black text-white dark:bg-white dark:text-black font-medium px-3 py-1.5 rounded-md hover:opacity-90 transition"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowTopicInput(null)}
                      className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-2"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowTopicInput(unit.id)}
                    className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white pt-2 block"
                  >
                    + Add topic
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add unit Form */}
      <div>
        {showUnitInput ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={newUnitName}
              onChange={(e) => setNewUnitName(e.target.value)}
              placeholder="Unit name"
              className="flex-1 border dark:border-gray-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white bg-white dark:bg-gray-900 dark:text-white"
            />
            <button
              onClick={handleAddUnit}
              className="bg-black text-white dark:bg-white dark:text-black text-xs font-medium px-5 py-2 rounded-xl hover:opacity-90 transition"
            >
              Add unit
            </button>
            <button
              onClick={() => setShowUnitInput(false)}
              className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-3"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowUnitInput(true)}
            className="text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl py-3 w-full transition"
          >
            + Add new unit
          </button>
        )}
      </div>
    </div>
  )
}