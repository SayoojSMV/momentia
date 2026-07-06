import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const { topicId, topicName, subjectName, difficulty } = await request.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `You are a study content generator for students.
Generate clear, concise study notes for the following topic:

Subject: ${subjectName}
Topic: ${topicName}
Difficulty: ${difficulty}

Write study notes that:
- Explain the concept clearly
- Include key points and definitions
- Give a practical example if relevant
- Are appropriate for a ${difficulty} difficulty level
- Are formatted with clear sections using plain text (no markdown symbols)
- Are concise enough to study in ${difficulty === 'easy' ? '15-20' : difficulty === 'medium' ? '25-35' : '40-50'} minutes

Write the content directly without any preamble.`

    const result = await model.generateContent(prompt)
    const content = result.response.text()

    // Save content to the topic — only if not already set
    const { data: existing } = await supabase
      .from('topics')
      .select('content')
      .eq('id', topicId)
      .single()

    if (!existing?.content) {
      await supabase
        .from('topics')
        .update({ content })
        .eq('id', topicId)
    }

    return Response.json({ content: existing?.content || content })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}