# Production deployment

## Recommended configuration

Use the repository's Render Blueprint to create two services:

- `cr8veresearch-mcp`: a public Node web service with managed HTTPS.
- `cr8veresearch-web`: a static Vite site on Render's CDN.

The Node service installs from `mcp-server`, starts with `npm start`, binds to
the platform-provided `PORT` on `0.0.0.0`, and exposes `GET /health`. The MCP
endpoint remains `POST /mcp`; its Supabase JWT validation and request-scoped
RLS access are unchanged.

The selected Node plan avoids free-tier sleep during judging. The Blueprint
uses Frankfurt for the Node service and leaves the static site on the global
CDN.

## Environment variable names

Configure these names in the Render dashboard. Do not commit their values.

Node MCP service:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `BEDROCK_MODEL_ID`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_SESSION_TOKEN` (only when the AWS credentials require it)
- `AGENT_MODEL_PROVIDER`
- `AGENT_ALLOWED_ORIGIN`
- `NODE_ENV`

Static Vite frontend:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_AGENT_API_URL`

Render supplies `PORT`; do not create or override it. Vite variables are
embedded at build time, so rebuild the static site after changing them.

## URL relationships

After Render assigns both HTTPS service URLs:

- Set `AGENT_ALLOWED_ORIGIN` to the static frontend origin, with no path.
- Set `VITE_AGENT_API_URL` to the Node service origin, with no path.
- The public MCP URL is the Node service origin plus `/mcp`.
- The production health URL is the Node service origin plus `/health`.
- Add the static frontend URL to the Supabase project's allowed application
  URLs and redirect URLs if its authentication settings require it.

The MCP endpoint does not use browser CORS. External clients must continue to
send a valid Supabase user JWT in the `Authorization: Bearer` header.

## Windows deployment checklist

Run the release checks from Windows CMD before committing:

```cmd
cd /d C:\Users\User\Desktop\cr8veResearch
npm ci
npm test
npm run lint
npm run build
cd mcp-server
npm ci
npm test
```

Then, after committing and pushing the reviewed files:

1. Sign in to Render and create a new Blueprint from the GitHub repository.
2. Confirm Render detects the root `render.yaml` and proposes both services.
3. Enter every required environment variable in the Blueprint form or each
   service's Environment page. Keep all secret values out of Git and logs.
4. Apply the Blueprint and wait for both deploys to complete.
5. Copy the two assigned HTTPS origins and configure the URL relationships
   above. Trigger a new static-site deploy after setting its Vite variables.
6. Open the health URL and confirm it returns HTTP 200 with `status` set to
   `ok`.
7. Open the frontend, sign in, and verify existing Supabase research loads.
8. Run the real external MCP verification against the public MCP URL using the
   instructions in `mcp-server/EXTERNAL_MCP.md`.

Do not place a Supabase user JWT, password, AWS credential, or environment file
in the repository or Render build command.
