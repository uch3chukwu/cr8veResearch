# cr8veResearch

A private research environment for creatives.

cr8veResearch helps artists, writers, musicians, designers, and other creatives organize the research behind their work — references, sources, notes, media, creators, subjects, and the connections between them.

> question → research → collect → interpret → connect → create → question

## Features

- Research spaces
- References and media
- Notes
- Sources
- Creators and subjects
- Reference relationships
- Private user accounts

## Built with

- React
- Vite
- JavaScript
- Supabase
- PostgreSQL
- Model Context Protocol (MCP) over Streamable HTTP

## Alexa+ hackathon implementation

The project includes a self-hosted MCP server at `POST /mcp`. It uses
Streamable HTTP, negotiates MCP protocol `2025-11-25` or later, requires a
Supabase user access token, and keeps each tool request inside the user's
existing Supabase Row Level Security boundary.

Available MCP tools: `ping`, `search_research`, `get_reference`,
`get_research_space`, and `create_note`.

The local integration suite verifies protocol negotiation, discovery, tool
invocation, invalid-token rejection, and user-scoped persistence. The deployed
public endpoint has also passed authenticated end-to-end verification with a
Supabase user token: it negotiated MCP `2025-11-25`, discovered five tools,
searched and retrieved the expected user-scoped reference, created and
retrieved a verification note, and rejected invalid credentials.

## Direction

cr8veResearch is evolving into an agent-accessible research environment where AI can help creatives navigate, connect, and interact with research they've already accumulated — without replacing the research process itself.

## Status

Work in progress.

## Local development

Create `.env` in the repository root from `.env.example` and configure:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_AGENT_API_URL` (defaults to the separately running agent server URL)

Create `mcp-server/.env` from `mcp-server/.env.example` and configure:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `BEDROCK_MODEL_ID`
- `AWS_REGION`
- `AGENT_MODEL_PROVIDER` (`bedrock` by default)
- `AGENT_ALLOWED_ORIGIN` (the exact frontend origin; locally this is normally
  `http://localhost:5173`)

To exercise the authenticated agent and its real read-only Supabase tools
without AWS inference, set the following only in local development:

```env
AGENT_MODEL_PROVIDER=mock
NODE_ENV=development
```

Mock mode is deterministic, labels every answer as a local-development mock,
and displays only results returned by the existing research tools. It is
rejected when `NODE_ENV=production`. Switch back to `bedrock` for real model
reasoning.

Run the services in separate terminals:

```sh
npm run dev
```

```sh
cd mcp-server
npm run dev
```

## Production deployment

The repository includes a Render Blueprint for a public HTTPS Node MCP server
and a static Vite frontend. See [DEPLOYMENT.md](DEPLOYMENT.md) for the exact
Windows deployment checklist, environment variable names, health check, and
post-deployment verification steps.

## Hackathon submission materials

See [HACKATHON_SUBMISSION.md](HACKATHON_SUBMISSION.md) for a truthful Devpost
project description, required product feedback, a three-minute demo script,
and the final submission checklist. The external MCP test procedure is in
[mcp-server/EXTERNAL_MCP.md](mcp-server/EXTERNAL_MCP.md).

## License

This project is licensed under the [MIT License](LICENSE).
