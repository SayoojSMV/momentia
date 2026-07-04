import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const { subjectId, subjectName, materials } = await request.json()

    if (!subjectId || !subjectName || !materials?.length) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: [
        {
          functionDeclarations: [
            {
              name: 'save_roadmap',
              description: 'Save a generated study roadmap for one subject',
              parameters: {
                type: 'object',
                required: ['units'],
                properties: {
                  units: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['name', 'topics'],
                      properties: {
                        name: { type: 'string' },
                        topics: {
                          type: 'array',
                          items: {
                            type: 'object',
                            required: ['name', 'difficulty', 'minutes'],
                            properties: {
                              name: { type: 'string' },
                              difficulty: {
                                type: 'string',
                                enum: ['easy', 'medium', 'hard'],
                              },
                              minutes: { type: 'integer' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      ],
      toolConfig: { functionCallingConfig: { mode: 'ANY', allowedFunctionNames: ['save_roadmap'] } },
    })

    const materialsList = materials.map((m) => `- ${m.file_name}`).join('\n')

    const prompt = `You are a study roadmap generator. Generate a study roadmap for the subject "${subjectName}".

The student has uploaded these materials:
${materialsList}

Break the subject into logical units and topics based on the subject name and uploaded material names.
Order topics from foundational to advanced within each unit.
Estimate realistic study time in minutes per topic.
Call save_roadmap exactly once with the complete roadmap.`

    const result = await model.generateContent(prompt)
    const response = result.response

    // Extract the function call result
    const functionCall = response.candidates?.[0]?.content?.parts?.find(
      (part) => part.functionCall
    )

    if (!functionCall) {
      return Response.json({ error: 'No roadmap generated' }, { status: 500 })
    }

    const { units } = functionCall.functionCall.args

    // Delete existing units and topics (clean regeneration)
    await supabase.from('units').delete().eq('subject_id', subjectId)

    // Insert new units and topics
    for (let i = 0; i < units.length; i++) {
      const unit = units[i]

      const { data: unitData, error: unitError } = await supabase
        .from('units')
        .insert({
          subject_id: subjectId,
          name: unit.name,
          order_index: i,
        })
        .select()
        .single()

      if (unitError) continue

      for (let j = 0; j < unit.topics.length; j++) {
        const topic = unit.topics[j]
        await supabase.from('topics').insert({
          unit_id: unitData.id,
          name: topic.name,
          difficulty: topic.difficulty,
          minutes: topic.minutes,
          order_index: j,
          source: 'from_materials',
        })
      }
    }

    return Response.json({ success: true, unitCount: units.length })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}