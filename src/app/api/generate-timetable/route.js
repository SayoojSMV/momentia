import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const { userId, minutesPerDay } = await request.json()

    if (!userId || !minutesPerDay) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Fetch all academics and test_prep subjects with exam dates
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', userId)
      .in('category', ['academics', 'test_prep'])
      .not('exam_date', 'is', null)
      .order('exam_date', { ascending: true })

    if (subjectsError || !subjects?.length) {
      return Response.json({ error: 'No subjects with exam dates found' }, { status: 400 })
    }

    // For each subject, fetch incomplete topics with their units
    const allSessions = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const subject of subjects) {
      const examDate = new Date(subject.exam_date)
      examDate.setHours(0, 0, 0, 0)

      if (examDate <= today) continue // skip past exams

      // Fetch units for this subject
      const { data: units } = await supabase
        .from('units')
        .select('id, order_index')
        .eq('subject_id', subject.id)
        .order('order_index', { ascending: true })

      if (!units?.length) continue

      // Fetch incomplete topics for each unit
      for (const unit of units) {
        const { data: topics } = await supabase
          .from('topics')
          .select('id, name, minutes, order_index')
          .eq('unit_id', unit.id)
          .neq('status', 'completed')
          .order('order_index', { ascending: true })

        if (!topics?.length) continue

        for (const topic of topics) {
          allSessions.push({
            topic_id: topic.id,
            subject_id: subject.id,
            subject_name: subject.name,
            topic_name: topic.name,
            minutes: topic.minutes || 25,
            exam_date: examDate,
          })
        }
      }
    }

    if (!allSessions.length) {
      return Response.json({ error: 'No incomplete topics found' }, { status: 400 })
    }

    // Simple earliest-deadline-first scheduler
    // Assign topics to days starting from today
    const schedule = []
    let currentDate = new Date(today)
    let minutesUsedToday = 0
    let sessionIndex = 0

    while (sessionIndex < allSessions.length) {
      const session = allSessions[sessionIndex]

      // Don't schedule past the exam date
      if (currentDate >= session.exam_date) {
        sessionIndex++
        continue
      }

      // If we've used up today's minutes, move to next day
      if (minutesUsedToday + session.minutes > minutesPerDay) {
        currentDate = new Date(currentDate)
        currentDate.setDate(currentDate.getDate() + 1)
        minutesUsedToday = 0
        continue
      }

      schedule.push({
        user_id: userId,
        topic_id: session.topic_id,
        subject_id: session.subject_id,
        scheduled_date: currentDate.toISOString().split('T')[0],
      })

      minutesUsedToday += session.minutes
      sessionIndex++
    }

    // Delete existing schedule for this user and re-insert
    await supabase.from('schedule').delete().eq('user_id', userId)

    if (schedule.length > 0) {
      await supabase.from('schedule').insert(schedule)
    }

    return Response.json({ success: true, sessionCount: schedule.length })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}