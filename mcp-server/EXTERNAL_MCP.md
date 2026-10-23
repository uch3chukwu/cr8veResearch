# External MCP connectivity

The server exposes MCP over Streamable HTTP at `POST /mcp`. Each request must
carry a Supabase user access token as `Authorization: Bearer <token>`. The
server validates the token with Supabase Auth before MCP handling, then creates
an anon-key Supabase client that forwards the same user JWT. Database access is
therefore evaluated by the existing Row Level Security policies.

The separate `POST /agent` endpoint is the cr8veResearch web application's
Bedrock-backed internal agent route. It is not part of the MCP protocol. Its
origin allowlist (`AGENT_ALLOWED_ORIGIN`) applies only to `/agent`; normal
server-side MCP clients do not require browser CORS headers.

## Windows CMD: install, run, and test

From the repository root:

```cmd
cd mcp-server
npm install
npm test
```

To run the server, configure `mcp-server\.env` from `.env.example`, then use:

```cmd
cd mcp-server
npm start
```

In a second CMD window, use a unique query and the ID of a result known to
belong to the authenticated test user:

```cmd
cd mcp-server
set "MCP_URL=http://127.0.0.1:3001/mcp"
set "MCP_ACCESS_TOKEN=<SUPABASE_USER_ACCESS_TOKEN>"
set "MCP_SEARCH_QUERY=<UNIQUE_USER_RESEARCH_TEXT>"
set "MCP_EXPECT_REFERENCE_ID=<EXPECTED_REFERENCE_ID>"
set "MCP_EXPECT_REFERENCE_TITLE=<EXACT_EXPECTED_REFERENCE_TITLE>"
npm run test:mcp:live
```

The client does not print the token, query, or expected ID. Clear the values
from that CMD process afterward:

```cmd
set MCP_ACCESS_TOKEN=
set MCP_SEARCH_QUERY=
set MCP_EXPECT_REFERENCE_ID=
set MCP_EXPECT_REFERENCE_TITLE=
```

The live client verifies negotiation of MCP `2025-11-25` or later, lists the
required tools, invokes `ping` and `search_research`, loads the uniquely
identified existing reference with `get_reference`, creates a timestamped note
on it with `create_note`, reloads the reference to prove persistence, and
verifies that a derived invalid credential is rejected. A live pass requires
valid Supabase configuration, a current user access token, and an existing
reference whose ID, exact title, and uniquely identifying search text are
known. It never prints those inputs or the token.

## Public Render verification

Use this only after placing a fresh Supabase **user access token** in
`MCP_ACCESS_TOKEN` in the current CMD process. The token stays in that local
process; do not paste it into this file, Git, Devpost, or chat.

First validate that the configured token belongs to the same Supabase project
as the frontend:

```cmd
cd /d C:\Users\User\Desktop\cr8veResearch\mcp-server
npm run test:frontend-token
```

Only after that command prints `PASS: token_valid_for_frontend_supabase`, set
the public endpoint and the existing non-sensitive reference fixtures. Confirm
that the authenticated user can read the fixture and that the unique query
returns it before running the complete external-client verification:

```cmd
set "MCP_URL=https://cr8veresearch-mcp.onrender.com/mcp"
set "MCP_SEARCH_QUERY=<UNIQUE_USER_RESEARCH_TEXT>"
set "MCP_EXPECT_REFERENCE_ID=<EXPECTED_REFERENCE_ID>"
set "MCP_DIAGNOSTICS=1"
npm run test:live-fixture
```

On success, the inspector prints the exact `MCP_EXPECT_REFERENCE_TITLE` value
for the authenticated user's accessible fixture. Set that value, then run the
complete external-client verification:

```cmd
set "MCP_EXPECT_REFERENCE_TITLE=<EXACT_TITLE_PRINTED_BY_THE_FIXTURE_INSPECTOR>"
set "MCP_DIAGNOSTICS=1"
npm run test:mcp:live
```

The test creates one timestamped note on the selected reference, so choose a
dedicated non-sensitive test reference. A failed initialization prints only
the safe error category; it never prints token material, claims, configuration
values, or research content. The fixture inspector prints only the reference
title needed by the live test. Clear the local values after the run:

```cmd
set MCP_ACCESS_TOKEN=
set MCP_SEARCH_QUERY=
set MCP_EXPECT_REFERENCE_ID=
set MCP_EXPECT_REFERENCE_TITLE=
set MCP_DIAGNOSTICS=
```
