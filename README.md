# GraphQL MCP

A Model Context Protocol server that enables LLMs to interact with GraphQL APIs.

## Installation

```bash
npm install -g graphql-mcp
```

## Configuration

Set environment variables:
```bash
export GRAPHQL_ENDPOINT="https://api.github.com/graphql"
export GRAPHQL_AUTH_TOKEN="your_token"
```

Or configure via MCP client (Claude Desktop):
```json
{
  "mcpServers": {
    "graphql": {
      "command": "graphql-mcp",
      "env": {
        "GRAPHQL_ENDPOINT": "https://api.github.com/graphql",
        "GRAPHQL_AUTH_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

## Usage

The server automatically configures from environment variables and creates MCP tools for each GraphQL resolver:

**Available MCP tools:**
- `get_status` - Check connection status
- `query_user` - Call the GraphQL user query (example)
- `query_repository` - Call the GraphQL repository query (example)
- `mutation_createIssue` - Call the GraphQL createIssue mutation (example)
- ... (one tool per GraphQL resolver discovered)

LLMs can directly call `query_user(login: "torvalds")` instead of writing GraphQL queries.

## Authentication

Full support for GraphQL authentication via headers:

```bash
# GitHub Personal Access Token
export GRAPHQL_AUTH_TOKEN="ghp_your_token"

# API Key
export GRAPHQL_API_KEY="your_api_key"  

# Custom headers (JSON)
export GRAPHQL_HEADERS='{"Authorization": "Bearer token", "X-Custom": "value"}'
```

See [examples/authentication-examples.md](examples/authentication-examples.md) for more authentication patterns.

## Examples

- [examples/client-example.js](examples/client-example.js) - Complete MCP client example
- [examples/authentication-examples.md](examples/authentication-examples.md) - Authentication patterns

## License

MIT