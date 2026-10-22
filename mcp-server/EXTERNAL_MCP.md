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
