const MOCK_LABEL = '[MOCK MODEL — LOCAL DEVELOPMENT ONLY]'

function createToolCall(id, name, input) {
  return {
    text: undefined,
    toolCalls: [{ id, name, input }]
  }
}

function formatToolResults(toolMessages) {
  const sections = toolMessages.map((message) => (
    `${message.name}:\n${JSON.stringify(message.content, null, 2)}`
  ))

  return [
    MOCK_LABEL,
    'This deterministic response displays actual research tool results. It does not perform model reasoning or infer additional findings.',
    ...sections
  ].join('\n\n')
}

export function createMockModel() {
  return {
    async converse({ messages, tools }) {
      const toolMessages = messages.filter((message) => message.role === 'tool')

      if (toolMessages.length === 0) {
        const userMessage = messages.find((message) => message.role === 'user')
        const canSearch = tools.some((tool) => tool.name === 'search_research')

        if (!canSearch || typeof userMessage?.content !== 'string') {
          throw new Error('Mock research model cannot search')
        }

        return createToolCall('mock-search-1', 'search_research', {
          query: userMessage.content,
          limit: 5
        })
      }

      const searchMessage = toolMessages.find(
        (message) => message.name === 'search_research'
      )
      const searchResults = searchMessage?.content?.results

      if (!Array.isArray(searchResults) || searchResults.length === 0) {
        return {
          text: `${MOCK_LABEL}\n\nNo relevant research was found for this question.`,
          toolCalls: []
        }
      }

      const hasDetailResult = toolMessages.some(
        (message) => (
          message.name === 'get_reference' ||
          message.name === 'get_research_space'
        )
      )

      if (!hasDetailResult) {
        const referenceResult = searchResults.find((result) => (
          typeof result.reference_id === 'string'
        ))

        if (referenceResult) {
          return createToolCall('mock-reference-1', 'get_reference', {
            reference_id: referenceResult.reference_id
          })
        }

        const spaceResult = searchResults.find((result) => (
          typeof result.space_id === 'string'
        ))

        if (spaceResult) {
          return createToolCall('mock-space-1', 'get_research_space', {
            space_id: spaceResult.space_id
          })
        }
      }

      return {
        text: formatToolResults(toolMessages),
        toolCalls: []
      }
    }
  }
}
