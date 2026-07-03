'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SubjectPage({ params }) {
    const { id } = use(params)
    const [subject, setSubject] = useState(null)
    const [units, setUnits] = useState([])
    const [expandedUnit, setExpandedUnit] = useState(null)
    const [topics, setTopics] = useState({})
    const [loading, setLoading] = useState(true)
    const [showUnitInput, setShowUnitInput] = useState(false)
    const [newUnitName, setNewUnitName] = useState('')
    const [showTopicInput, setShowTopicInput] = useState(null)
    const [newTopicName, setNewTopicName] = useState('')
    const router = useRouter()

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                router.replace('/login')
                return
            }

            // Fetch subject
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

            // Fetch units
            supabase
                .from('units')
                .select('*')
                .eq('subject_id', id)
                .order('order_index', { ascending: true })
                .then(({ data, error }) => {
                    if (!error) setUnits(data)
                    setLoading(false)
                })
        })
    }, [id, router])

    const handleExpandUnit = async (unitId) => {
        // Toggle closed if already open
        if (expandedUnit === unitId) {
            setExpandedUnit(null)
            return
        }

        setExpandedUnit(unitId)

        // Only fetch topics if we haven't already
        if (topics[unitId]) return

        const { data, error } = await supabase
            .from('topics')
            .select('*')
            .eq('unit_id', unitId)
            .order('order_index', { ascending: true })

        if (!error) {
            setTopics((prev) => ({ ...prev, [unitId]: data }))
        }
    }

    const handleAddUnit = async () => {
        if (!newUnitName.trim()) return

        const { data, error } = await supabase
            .from('units')
            .insert({
                subject_id: id,
                name: newUnitName.trim(),
                order_index: units.length,
            })
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
            .insert({
                unit_id: unitId,
                name: newTopicName.trim(),
                order_index: existingTopics.length,
            })
            .select()
            .single()

        if (!error) {
            setTopics((prev) => ({
                ...prev,
                [unitId]: [...existingTopics, data],
            }))
            setNewTopicName('')
            setShowTopicInput(null)
        }
    }

    if (loading) return null

    return (
        <main className="min-h-screen bg-gray-50 p-6 max-w-3xl mx-auto">
            {/* Back button */}
            <button
                onClick={() => router.push('/')}
                className="text-sm text-gray-500 hover:text-gray-800 mb-4 inline-block"
            >
                ← Back to dashboard
            </button>

            {/* Subject header */}
            <div className="mb-6">
                <p className="text-xs text-gray-400 uppercase mb-1">
                    {subject?.category.replace('_', ' ')}
                </p>
                <h1 className="text-2xl font-semibold">{subject?.name}</h1>
                {subject?.exam_date && (
                    <p className="text-sm text-gray-500 mt-1">
                        Exam: {new Date(subject.exam_date).toLocaleDateString()}
                    </p>
                )}
            </div>

            {/* Units */}
            <div className="space-y-3">
                {units.length === 0 && (
                    <p className="text-gray-400 text-sm">No units yet — add one below.</p>
                )}

                {units.map((unit) => (
                    <div key={unit.id} className="border rounded-lg bg-white overflow-hidden">
                        {/* Unit header */}
                        <button
                            onClick={() => handleExpandUnit(unit.id)}
                            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
                        >
                            <span className="font-medium">{unit.name}</span>
                            <span className="text-gray-400 text-sm">
                                {expandedUnit === unit.id ? '▲' : '▼'}
                            </span>
                        </button>

                        {/* Topics (shown when expanded) */}
                        {expandedUnit === unit.id && (
                            <div className="border-t px-4 py-3 space-y-2">
                                {(topics[unit.id] || []).length === 0 && (
                                    <p className="text-gray-400 text-sm">No topics yet.</p>
                                )}
                                {(topics[unit.id] || []).map((topic) => (
                                    <div
                                        key={topic.id}
                                        onClick={() => router.push(`/subject/${id}/topic/${topic.id}`)}
                                        className="flex items-center gap-3 py-2 border-b last:border-0 cursor-pointer hover:bg-gray-50 rounded"
                                    >
                                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${topic.status === 'completed' ? 'bg-black' :
                                            topic.status === 'in_progress' ? 'bg-gray-400' :
                                                'bg-gray-200'
                                            }`} />
                                        <span className="text-sm">{topic.name}</span>
                                        <span className="ml-auto text-xs text-gray-400 capitalize">
                                            {topic.difficulty}
                                        </span>
                                    </div>
                                ))}

                                {/* Add topic */}
                                {showTopicInput === unit.id ? (
                                    <div className="flex gap-2 mt-2">
                                        <input
                                            type="text"
                                            value={newTopicName}
                                            onChange={(e) => setNewTopicName(e.target.value)}
                                            placeholder="Topic name"
                                            className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                                        />
                                        <button
                                            onClick={() => handleAddTopic(unit.id)}
                                            className="text-sm bg-black text-white px-3 py-1 rounded"
                                        >
                                            Add
                                        </button>
                                        <button
                                            onClick={() => setShowTopicInput(null)}
                                            className="text-sm text-gray-400 hover:text-gray-700"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowTopicInput(unit.id)}
                                        className="text-sm text-gray-400 hover:text-gray-700 mt-1"
                                    >
                                        + Add topic
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Add unit */}
            <div className="mt-4">
                {showUnitInput ? (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newUnitName}
                            onChange={(e) => setNewUnitName(e.target.value)}
                            placeholder="Unit name"
                            className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                        />
                        <button
                            onClick={handleAddUnit}
                            className="bg-black text-white text-sm px-4 py-2 rounded-md"
                        >
                            Add
                        </button>
                        <button
                            onClick={() => setShowUnitInput(false)}
                            className="text-sm text-gray-400 hover:text-gray-700"
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowUnitInput(true)}
                        className="text-sm text-gray-500 hover:text-gray-800 border rounded-md px-4 py-2 w-full"
                    >
                        + Add unit
                    </button>
                )}
            </div>
        </main>
    )
}