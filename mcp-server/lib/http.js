import { Buffer } from 'node:buffer'
import { z } from 'zod'

import { createResearchModel } from '../agent/model.js'
import { runResearchAgent } from '../agent/run.js'

const AGENT_MESSAGE_MAX_LENGTH = 4000
const REQUEST_BODY_MAX_BYTES = 16 * 1024

const agentRequestSchema = z.object({
  message: z.string().trim().min(1).max(AGENT_MESSAGE_MAX_LENGTH)
}).strict()

function getBearerToken(authorization) {
  if (typeof authorization !== 'string') {
    return null
  }

  const match = authorization.match(/^Bearer ([^\s]+)$/i)
  return match?.[1] ?? null
}

function sendJson(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    ...headers
  })
  res.end(JSON.stringify(body))
}

async function readJsonBody(req) {
  const chunks = []
  let size = 0

  for await (const chunk of req) {
    size += chunk.length

    if (size > REQUEST_BODY_MAX_BYTES) {
      throw new Error('Request body is too large')
    }

    chunks.push(chunk)
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

export function createHttpRequestHandler({
  handleMcpRequest,
  createSupabaseClient,
  createModel = createResearchModel,
  runAgent = runResearchAgent,
  allowedAgentOrigin = globalThis.process?.env.AGENT_ALLOWED_ORIGIN ||
    'http://localhost:5173',
  logger = console
}) {
  return async function handleHttpRequest(req, res) {
    if (req.url?.startsWith('/mcp')) {
      if (!getBearerToken(req.headers.authorization)) {
        sendJson(
          res,
          401,
          { error: 'Bearer authorization required' },
          { 'WWW-Authenticate': 'Bearer' }
        )
        return
      }

      handleMcpRequest(req, res)
      return
    }

    if (req.url === '/agent') {
      const origin = req.headers.origin
      const hasAllowedOrigin = !origin || origin === allowedAgentOrigin
      const corsHeaders = origin && hasAllowedOrigin
        ? {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true',
            Vary: 'Origin'
          }
        : {}

      if (!hasAllowedOrigin) {
        sendJson(res, 403, { error: 'Origin is not allowed' })
        return
      }

      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          ...corsHeaders,
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        })
        res.end()
        return
      }

      if (req.method !== 'POST') {
        res.writeHead(404)
        res.end('Not found')
        return
      }

      const accessToken = getBearerToken(req.headers.authorization)

      if (!accessToken) {
        sendJson(
          res,
          401,
          { error: 'Bearer authorization required' },
          {
            ...corsHeaders,
            'WWW-Authenticate': 'Bearer'
          }
        )
        return
      }

      let input

      try {
        input = agentRequestSchema.parse(await readJsonBody(req))
      } catch {
        sendJson(
          res,
          400,
          { error: 'A valid message is required' },
          corsHeaders
        )
        return
      }

      let supabase

      try {
        supabase = createSupabaseClient(accessToken)
        const { data, error } = await supabase.auth.getUser()

        if (error || !data.user) {
          sendJson(
            res,
            401,
            { error: 'Authentication failed' },
            corsHeaders
          )
          return
        }
      } catch {
        sendJson(
          res,
          401,
          { error: 'Authentication failed' },
          corsHeaders
        )
        return
      }

      try {
        const answer = await runAgent({
          model: createModel(),
          supabase,
          message: input.message
        })

        sendJson(res, 200, { answer }, corsHeaders)
      } catch (error) {
        logger.error('Research agent request failed', error)
        sendJson(
          res,
          503,
          { error: 'Research agent is unavailable' },
          corsHeaders
        )
      }

      return
    }

    if (req.url === '/' && req.method === 'GET') {
      sendJson(res, 200, {
        name: 'cr8veResearch MCP',
        status: 'online',
        endpoint: '/mcp'
      })
      return
    }

    res.writeHead(404)
    res.end('Not found')
  }
}
