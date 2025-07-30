# Authentication Examples

The GraphQL MCP server supports all standard GraphQL authentication methods through headers.

## Environment Variable Authentication

### GitHub Personal Access Token
```bash
export GRAPHQL_ENDPOINT="https://api.github.com/graphql"
export GRAPHQL_AUTH_TOKEN="ghp_your_personal_access_token"
```

### API Key Authentication
```bash
export GRAPHQL_ENDPOINT="https://api.example.com/graphql"
export GRAPHQL_API_KEY="your-api-key-here"
```

### Custom Headers (JSON format)
```bash
export GRAPHQL_ENDPOINT="https://api.example.com/graphql"
export GRAPHQL_HEADERS='{"Authorization": "Bearer token", "X-Custom": "value"}'
```

## Claude Desktop Configuration

### GitHub API
```json
{
  "mcpServers": {
    "github-graphql": {
      "command": "graphql-mcp",
      "env": {
        "GRAPHQL_ENDPOINT": "https://api.github.com/graphql",
        "GRAPHQL_AUTH_TOKEN": "ghp_your_github_token"
      }
    }
  }
}
```

### Shopify Storefront API
```json
{
  "mcpServers": {
    "shopify-graphql": {
      "command": "graphql-mcp",
      "env": {
        "GRAPHQL_ENDPOINT": "https://shop.myshopify.com/api/2024-01/graphql.json",
        "GRAPHQL_HEADERS": "{\"X-Shopify-Storefront-Access-Token\": \"your_storefront_token\"}"
      }
    }
  }
}
```

### Hasura with Admin Secret
```json
{
  "mcpServers": {
    "hasura-graphql": {
      "command": "graphql-mcp",
      "env": {
        "GRAPHQL_ENDPOINT": "https://your-app.hasura.app/v1/graphql",
        "GRAPHQL_HEADERS": "{\"x-hasura-admin-secret\": \"your_admin_secret\"}"
      }
    }
  }
}
```

## Programmatic Authentication

### Via configure_graphql Tool
```javascript
await client.callTool({
  name: 'configure_graphql',
  arguments: {
    endpoint: 'https://api.github.com/graphql',
    headers: {
      'Authorization': 'Bearer ghp_your_token',
      'User-Agent': 'MyApp/1.0',
      'Content-Type': 'application/json'
    },
    timeout: 30000,
    maxDepth: 10,
    maxComplexity: 100,
    disabledResolvers: ['sensitiveQuery', 'adminMutation']
  }
});
```

## Security Features

### Query Limiting
```bash
export GRAPHQL_MAX_DEPTH="5"        # Prevent deep nesting
export GRAPHQL_MAX_COMPLEXITY="50"  # Limit query complexity
export GRAPHQL_TIMEOUT="30000"      # 30 second timeout
```

### Resolver Blocking
```bash
export GRAPHQL_DISABLED_RESOLVERS="adminUsers,deleteUser,sensitiveData"
```

## Common Authentication Patterns

### 1. Bearer Token (OAuth2, JWT)
```json
{
  "headers": {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. API Key in Header
```json
{
  "headers": {
    "X-API-Key": "your-api-key",
    "X-Client-ID": "your-client-id"
  }
}
```

### 3. Basic Authentication
```json
{
  "headers": {
    "Authorization": "Basic dXNlcjpwYXNzd29yZA=="
  }
}
```

### 4. Custom Authentication Headers
```json
{
  "headers": {
    "X-Custom-Auth": "custom-token",
    "X-Tenant-ID": "tenant-123",
    "X-Version": "v1"
  }
}
```

## Testing Authentication

After configuring authentication, use the `get_status` tool to verify:

```javascript
const status = await client.callTool({
  name: 'get_status',
  arguments: {}
});
// Should show: configured: true, headersConfigured: true
```