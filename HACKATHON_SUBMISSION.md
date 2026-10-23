# cr8veResearch - Devpost submission pack

## Project description

cr8veResearch is a private research environment for creatives. It gives an
artist, writer, musician, or designer one place to organize references,
sources, notes, creators, subjects, and the links between them. Its Alexa+
track implementation is a self-hosted, authenticated MCP server that lets an
MCP client search a user's research, retrieve a reference, and create a note
without bypassing the user's existing Supabase Row Level Security policies.

The MCP server uses Streamable HTTP and negotiates MCP protocol version
`2025-11-25` or later. It exposes `ping`, `search_research`, `get_reference`,
`get_research_space`, and `create_note`. Each MCP request requires a Supabase
user access token; the server validates that token before handling MCP and
forwards it to a request-scoped Supabase client, preserving user isolation.

## Track and repository

- Primary track: Alexa+
- Required technology: self-hosted MCP server, Streamable HTTP, MCP `2025-11-25+`
- Repository: https://github.com/uch3chukwu/cr8veResearch
- License: [MIT](LICENSE)
- Frontend: https://cr8veresearch-web.onrender.com
- MCP endpoint: https://cr8veresearch-mcp.onrender.com/mcp

The endpoint is intentionally authenticated. Do not include a user JWT in the
Devpost submission or a public repository.

## What changed during the hackathon

- Added an authenticated Node MCP server with Streamable HTTP transport.
- Added user-scoped research retrieval and note creation MCP tools.
- Added an official MCP SDK integration suite that verifies initialization,
  protocol negotiation, discovery, tool calls, persistence, and invalid-token
  rejection.
- Added Render production configuration, a public health check, setup guides,
  and external-client verification instructions.
- Added a React/Vite frontend deployment configuration and project tab branding.

## Verification status

Verified locally and against the public Render MCP endpoint:

- 50 MCP/server tests passing.
- 13 frontend tests passing.
- ESLint and production Vite build passing.
- MCP protocol negotiation is asserted as `2025-11-25` or later.
- The live client successfully negotiated `2025-11-25`, discovered five tools,
  called `ping`, searched for and retrieved the expected user-owned reference,
  created and retrieved a timestamped note, and rejected invalid credentials.

Amazon Bedrock inference is not required for the MCP track demo and is not
claimed as working.

## Demo video script - under three minutes

Do not show tokens, environment variables, or private research not approved
for the video.

| Time | Screen and narration |
| --- | --- |
| 0:00-0:20 | Show the cr8veResearch frontend. “Creative research is scattered across links, references, and notes. cr8veResearch keeps that context private and connected.” |
| 0:20-0:40 | Sign in and open a non-sensitive research space. Show an existing reference and note. “Each user sees only their own research through Supabase authentication and RLS.” |
| 0:40-0:55 | Show `mcp-server/EXTERNAL_MCP.md` or the MCP endpoint URL. “For Alexa+, cr8veResearch exposes a self-hosted MCP server over Streamable HTTP using MCP 2025-11-25 or later.” |
| 0:55-1:50 | Run the verified external MCP client with secrets hidden. Show success for protocol negotiation, tool discovery, `ping`, search, reference retrieval, note creation/persistence, and invalid-token rejection. |
| 1:50-2:20 | Return to the frontend and show the newly created demo note on the same reference. “The MCP workflow writes through the same authenticated, user-scoped data boundary.” |
| 2:20-2:45 | Show the repository README, Render health URL, and relevant source files. “The repository includes the MCP implementation, tests, Render configuration, and Windows setup instructions.” |
| 2:45-3:00 | “cr8veResearch makes a creative’s accumulated research usable in an Alexa+-ready MCP workflow while preserving ownership and isolation.” |

## Required product feedback - paste into Devpost

### Model Context Protocol and MCP SDK

I used the Model Context Protocol and its JavaScript SDK to expose a
self-hosted Streamable HTTP server and to validate it with an external client.
The protocol made the boundaries between initialization, tool discovery, and
tool invocation clear, and the official client made it practical to test the
same workflow a judge will expect. The main onboarding friction was aligning
the current Streamable HTTP transport and protocol negotiation details across
server and client documentation. I would use MCP again because it provides a
portable way to bring private, user-scoped research into an assistant workflow.

### Render

I used Render to host the public HTTPS Node MCP server and static Vite
frontend. The Blueprint structure and health checks made the two-service setup
easy to document. The key operational concern is validating deployed secrets
without exposing them, especially when an authenticated endpoint rejects a
request. I would use Render again for a small public Node service, with more
deployment-time visibility into safe configuration fingerprints.

### Supabase

I used Supabase Auth and PostgreSQL Row Level Security to authenticate the MCP
caller and scope every research query and note write to that user. The client
and server integration made it straightforward to forward the user JWT to the
data layer. The main friction is that diagnosing a rejected token across a
separately deployed service requires careful safe logging. I would use it
again because the authentication and RLS model fit private research data well.

## Final Devpost checklist

- [ ] Select the Alexa+ primary track.
- [ ] Add every teammate and confirm invitations are accepted.
- [ ] Link the public GitHub repository and ensure the MIT license is visible.
- [ ] Paste the description and product feedback above.
- [ ] Explain the hackathon-window changes above.
- [ ] Upload a public English YouTube or Vimeo video under three minutes.
- [ ] Show the required MCP technology working in the video.
- [x] Authenticated public MCP verification passed: protocol negotiation, tool
  discovery, search/retrieval, note persistence, and invalid-token rejection.
- [ ] Submit before the Devpost deadline; do not modify submitted materials
  after the deadline.
