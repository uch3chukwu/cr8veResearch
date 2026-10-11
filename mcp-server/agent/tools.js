import { z } from 'zod'

import { loadReference } from '../lib/reference.js'
import { searchResearch } from '../lib/search.js'
import { loadResearchSpace } from '../lib/space.js'

const toolEntries = [
  {
    name: 'search_research',
    description: 'Search the user\'s accessible research by text',
    inputSchema: z.object({
      query: z.string().trim().min(1),
      limit: z.number().int().min(1).max(20).optional()
    }),
    execute: async (supabase, { query, limit = 10 }) => {
      const results = await searchResearch(supabase, query, limit)

      return {
        query,
        count: results.length,
        results
      }
    }
  },
  {
    name: 'get_reference',
    description: 'Get one accessible reference and its related research',
    inputSchema: z.object({
      reference_id: z.string().uuid()
    }),
    execute: async (supabase, { reference_id: referenceId }) => {
      const reference = await loadReference(supabase, referenceId)

      return {
        found: Boolean(reference),
        reference
      }
    }
  },
  {
    name: 'get_research_space',
    description: 'Get one accessible research space by ID',
    inputSchema: z.object({
      space_id: z.string().uuid()
    }),
    execute: async (supabase, { space_id: spaceId }) => {
      const space = await loadResearchSpace(supabase, spaceId)

      return {
        found: Boolean(space),
        research_space: space
      }
    }
  }
]

export const RESEARCH_AGENT_TOOLS = toolEntries.map((tool) => ({
  name: tool.name,
  description: tool.description,
  inputSchema: tool.inputSchema
}))

const toolsByName = new Map(toolEntries.map((tool) => [tool.name, tool]))

export async function executeResearchTool({ supabase, name, input }) {
  const tool = toolsByName.get(name)

  if (!tool) {
    throw new Error('Research agent requested an unavailable tool')
  }

  const validatedInput = tool.inputSchema.parse(input)
  return tool.execute(supabase, validatedInput)
}
