import { createServer } from 'node:http'
import { McpServer, createMcpHandler } from '@modelcontextprotocol/server'
import { toNodeHandler } from '@modelcontextprotocol/node'
import { createUserSupabaseClient } from './lib/supabase.js'

const PORT = process.env.PORT || 3001

function getBearerToken(authorization) {
  if (typeof authorization !== 'string') {
    return null
  }

  const match = authorization.match(/^Bearer ([^\s]+)$/i)
  return match?.[1] ?? null
}

function createMcpServer(supabase) {
  const server = new McpServer({
    name: 'cr8veResearch',
    version: '0.1.0'
  })

  // Keep the request-scoped client in this factory's closure for research tools.
  void supabase

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
