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

    const prompt = `You are an expert study content generator for university students.
Generate clean, beautifully structured Markdown study notes for the following topic:

Subject: ${subjectName}
Topic: ${topicName}
Difficulty: ${difficulty}

Write study notes that follow these strict formatting guidelines:
1. Use Markdown headers (## and ###) for logical sections.
2. Use bolding (**concept**) for key terms and definitions.
3. Use bullet points and numbered lists for readability.
4. Include a practical real-world example section.
5. Content length should match a ${difficulty === 'easy' ? '15-20' : difficulty === 'medium' ? '25-35' : '40-50'} minute study block.
6. Do NOT include a main title (H1 header #) at the very top.

Write the study notes directly without any conversational preamble or markdown codeblock wrappers (\`\`\`markdown).`

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