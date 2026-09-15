import { createServer } from 'node:http'
import { McpServer, createMcpHandler } from '@modelcontextprotocol/server'
import { toNodeHandler } from '@modelcontextprotocol/node'

const PORT = process.env.PORT || 3001

function createCr8veServer() {
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

  return server
}

const mcpHandler = createMcpHandler(createCr8veServer)
const handleMcpRequest = toNodeHandler(mcpHandler)

const httpServer = createServer((req, res) => {
  if (req.url?.startsWith('/mcp')) {
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