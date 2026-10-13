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
