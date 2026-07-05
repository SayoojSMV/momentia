import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const { messages, userId } = await request.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Fetch user's subjects and progress for context
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name, category, exam_date')
      .eq('user_id', userId)

    let contextText = 'The student has the following subjects:\n'

    if (subjects?.length) {
      for (const subject of subjects) {
        contextText += `\n- ${subject.name} (${subject.category})`
        if (subject.exam_date) {
          contextText += `, exam on ${subject.exam_date}`
        }

        const { data: units } = await supabase
          .from('units')
          .select('id, name')
          .eq('subject_id', subject.id)

        if (units?.length) {
          for (const unit of units) {
            const { data: topics } = await supabase
              .from('topics')
              .select('name, status, difficulty')
              .eq('unit_id', unit.id)

            if (topics?.length) {
              const completed = topics.filter((t) => t.status === 'completed').length
              contextText += `\n  Unit: ${unit.name} (${completed}/${topics.length} topics completed)`
            }
          }
        }
      }
    } else {
      contextText += 'No subjects added yet.'
    }

    const systemPrompt = `You are Momentia's AI study assistant. You help students study effectively, answer questions about their subjects, explain concepts, and give study advice.

Here is the current student's study context:
${contextText}

Be concise, encouraging, and helpful. If the student asks about a topic in their subjects, give a clear explanation.`

    // Build conversation as a single prompt string
    let conversationText = ''
    for (const msg of messages.slice(0, -1)) {
      if (msg.role === 'user') {
        conversationText += `Student: ${msg.content}\n`
      } else {
        conversationText += `Assistant: ${msg.content}\n`
      }
    }

    const lastMessage = messages[messages.length - 1]
    conversationText += `Student: ${lastMessage.content}\nAssistant:`

    const fullPrompt = `${systemPrompt}\n\nConversation so far:\n${conversationText}`

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const result = await model.generateContent(fullPrompt)
    const response = result.response.text()

    return Response.json({ reply: response })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}