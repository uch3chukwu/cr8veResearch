import { createServer } from 'node:http'
import { McpServer, createMcpHandler } from '@modelcontextprotocol/server'
import { toNodeHandler } from '@modelcontextprotocol/node'
import { z } from 'zod'
import { searchResearch } from './lib/search.js'
import { createUserSupabaseClient } from './lib/supabase.js'

const PORT = process.env.PORT || 3001

function getBearerToken(authorization) {
  if (typeof authorization !== 'string') {
    return null
  }

  const match = authorization.match(/^Bearer ([^\s]+)$/i)
  return match?.[1] ?? null
}

async function getResearchSpace(supabase, spaceId) {
  const { data, error } = await supabase
    .from('research_spaces')
    .select('id, title, description, created_at, updated_at')
    .eq('id', spaceId)
    .maybeSingle()

  if (error) {
    return {
      content: [
        {
          type: 'text',
          text: 'Unable to retrieve the research space.'
        }
      ],
      isError: true
    }
  }

  if (!data) {
    return {
      content: [
        {
          type: 'text',
          text: 'No accessible research space was found for that ID.'
        }
      ]
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2)
      }
    ],
    structuredContent: data
  }
}

async function runResearchSearch(supabase, query, limit) {
  try {
    const results = await searchResearch(supabase, query, limit)
    const response = {
      query,
      count: results.length,
      results
    }

    return {
      content: [
        {
          type: 'text',
          text: results.length > 0
            ? JSON.stringify(response, null, 2)
            : `No accessible research matched "${query}".`
        }
      ],
      structuredContent: response
    }
  } catch {
    return {
      content: [
        {
          type: 'text',
          text: 'Unable to search research right now.'
        }
      ],
      isError: true
    }
  }
}

function createMcpServer(supabase) {
  const server = new McpServer({
    name: 'cr8veResearch',
    version: '0.1.0'
  })

  server.registerTool(
    'ping',
    {
      description: 'Check whether the cr8veResearch MCP server is online'
    },
    async () => ({
      content: [
        {
          type: 'text',
          text: 'cr8veResearch MCP is online.'
        }
      ]
    })
  )

  server.registerTool(
    'get_research_space',
    {
      description: 'Get one accessible research space by ID',
      inputSchema: z.object({
        space_id: z.string()
      })
    },
    async ({ space_id: spaceId }) => getResearchSpace(supabase, spaceId)
  )

  server.registerTool(
    'search_research',
    {
      description: 'Search accessible research by text',
      inputSchema: z.object({
        query: z.string().trim().min(1),
        limit: z.number().int().min(1).max(20).optional()
      })
    },
    async ({ query, limit = 10 }) => (
      runResearchSearch(supabase, query, limit)
    )
  )

  return server
}

const mcpHandler = createMcpHandler(({ requestInfo }) => {
  const accessToken = getBearerToken(
    requestInfo?.headers.get('authorization')
  )

  if (!accessToken) {
    throw new Error('Authenticated MCP request is missing a Bearer token')
  }

  return createMcpServer(createUserSupabaseClient(accessToken))
})
const handleMcpRequest = toNodeHandler(mcpHandler)

const httpServer = createServer((req, res) => {
  if (req.url?.startsWith('/mcp')) {
    if (!getBearerToken(req.headers.authorization)) {
      res.writeHead(401, {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer'
      })
      res.end(JSON.stringify({ error: 'Bearer authorization required' }))
      return
    }

    handleMcpRequest(req, res)
    return
  }

  if (req.url === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        name: 'cr8veResearch MCP',
        status: 'online',
        endpoint: '/mcp'
      })
    )
    return
  }

  res.writeHead(404)
  res.end('Not found')
})

httpServer.listen(PORT, () => {
  console.log(`cr8veResearch MCP running on http://localhost:${PORT}`)
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`)
})
