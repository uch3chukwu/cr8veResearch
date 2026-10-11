import {
  executeResearchTool,
  RESEARCH_AGENT_TOOLS
} from './tools.js'

export const RESEARCH_AGENT_INSTRUCTION = `cr8veResearch is a private research environment. Answer using the user's accumulated research and retrieve relevant material when needed. Clearly distinguish retrieved research from your own general reasoning. Never pretend research exists when it was not retrieved. Surface useful connections, patterns, tensions, and questions in the material.`

export async function runResearchAgent({
  model,
  supabase,
  message,
  maxToolRounds = 5,
  executeTool = executeResearchTool
}) {
  const messages = [{ role: 'user', content: message }]
  let toolRounds = 0

  while (true) {
    const response = await model.converse({
      system: RESEARCH_AGENT_INSTRUCTION,
      messages,
      tools: RESEARCH_AGENT_TOOLS
    })
    const toolCalls = response.toolCalls ?? []

    if (toolCalls.length === 0) {
      if (typeof response.text !== 'string' || response.text.trim() === '') {
        throw new Error('Research model returned no final answer')
      }

      return response.text
    }

    if (toolRounds >= maxToolRounds) {
      throw new Error('Research agent exceeded the tool-round limit')
    }

    messages.push({ role: 'assistant', content: response })

    for (const toolCall of toolCalls) {
      let result

      try {
        result = await executeTool({
          supabase,
          name: toolCall.name,
          input: toolCall.input
        })
      } catch {
        throw new Error('Unable to execute a research tool')
      }

      messages.push({
        role: 'tool',
        toolCallId: toolCall.id,
        name: toolCall.name,
        content: result
      })
    }

    toolRounds += 1
  }
}
