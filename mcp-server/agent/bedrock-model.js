import {
  BedrockRuntimeClient,
  ConverseCommand
} from '@aws-sdk/client-bedrock-runtime'
import { z } from 'zod'

function addMessage(messages, message) {
  const previous = messages.at(-1)

  if (previous?.role === message.role) {
    previous.content.push(...message.content)
    return
  }

  messages.push(message)
}

function toBedrockMessages(messages) {
  const bedrockMessages = []

  for (const message of messages) {
    if (message.role === 'user') {
      addMessage(bedrockMessages, {
        role: 'user',
        content: [{ text: message.content }]
      })
      continue
    }

    if (message.role === 'assistant') {
      const content = []

      if (message.content.text) {
        content.push({ text: message.content.text })
      }

      for (const toolCall of message.content.toolCalls ?? []) {
        content.push({
          toolUse: {
            toolUseId: toolCall.id,
            name: toolCall.name,
            input: toolCall.input
          }
        })
      }

      addMessage(bedrockMessages, { role: 'assistant', content })
      continue
    }

    if (message.role === 'tool') {
      addMessage(bedrockMessages, {
        role: 'user',
        content: [
          {
            toolResult: {
              toolUseId: message.toolCallId,
              content: [{ json: message.content }]
            }
          }
        ]
      })
    }
  }

  return bedrockMessages
}

function validateStopReason(stopReason, toolCalls) {
  if (stopReason === 'tool_use') {
    const hasInvalidToolCall = toolCalls.some((toolCall) => (
      typeof toolCall.id !== 'string' || toolCall.id.trim() === '' ||
      typeof toolCall.name !== 'string' || toolCall.name.trim() === '' ||
      toolCall.input === undefined
    ))

    if (toolCalls.length === 0 || hasInvalidToolCall) {
      throw new Error('Bedrock returned malformed tool use')
    }

    return
  }

  if (stopReason === 'end_turn' || stopReason === 'stop_sequence') {
    if (toolCalls.length > 0) {
      throw new Error('Bedrock returned an inconsistent response')
    }

    return
  }

  if (stopReason === 'max_tokens') {
    throw new Error('Bedrock response was incomplete')
  }

  if (stopReason === 'content_filtered') {
    throw new Error('Bedrock response was filtered')
  }

  if (
    stopReason === 'malformed_tool_use' ||
    stopReason === 'malformed_model_output'
  ) {
    throw new Error('Bedrock returned malformed output')
  }

  throw new Error('Bedrock response did not complete successfully')
}

export function createBedrockModel({
  modelId = globalThis.process?.env.BEDROCK_MODEL_ID,
  region = globalThis.process?.env.AWS_REGION,
  client = new BedrockRuntimeClient({ region })
} = {}) {
  if (!modelId) {
    throw new Error('BEDROCK_MODEL_ID is required')
  }

  return {
    async converse({ system, messages, tools }) {
      let response

      try {
        response = await client.send(new ConverseCommand({
          modelId,
          system: [{ text: system }],
          messages: toBedrockMessages(messages),
          toolConfig: {
            tools: tools.map((tool) => ({
              toolSpec: {
                name: tool.name,
                description: tool.description,
                inputSchema: {
                  json: z.toJSONSchema(tool.inputSchema)
                }
              }
            }))
          }
        }))
      } catch {
        throw new Error('Unable to invoke the research model')
      }

      const content = response.output?.message?.content ?? []
      const text = content
        .filter((block) => typeof block.text === 'string')
        .map((block) => block.text)
        .join('\n')
      const toolCalls = content
        .filter((block) => block.toolUse)
        .map(({ toolUse }) => ({
          id: toolUse.toolUseId,
          name: toolUse.name,
          input: toolUse.input
        }))

      validateStopReason(response.stopReason, toolCalls)

      return {
        text: text || undefined,
        toolCalls
      }
    }
  }
}
