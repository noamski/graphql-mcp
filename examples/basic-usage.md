# Basic Usage Examples

This document provides step-by-step examples of how to use the GraphQL MCP Server.

## Getting Started

### 1. Install and Run the Server

```bash
npm install graphql-mcp
npm start
```

### 2. Configure Your First GraphQL Endpoint

Let's start with a public GraphQL API that doesn't require authentication:

```json
{
  "tool": "graphql_configure",
  "arguments": {
    "endpoint": "https://countries.trevorblades.com/",
    "timeout": 30000,
    "maxDepth": 5,
    "maxComplexity": 50
  }
}
```

### 3. Introspect the Schema

Discover what data is available:

```json
{
  "tool": "graphql_introspect",
  "arguments": {
    "includeDeprecated": false,
    "includeDescriptions": true
  }
}
```

This will return the complete schema structure, showing all available types, fields, and operations.

### 4. Execute Your First Query

```json
{
  "tool": "graphql_query",
  "arguments": {
    "query": "query { countries { name code emoji } }"
  }
}
```

## Working with Variables

### Query with Variables

```json
{
  "tool": "graphql_query",
  "arguments": {
    "query": "query GetCountry($code: ID!) { country(code: $code) { name capital currency phone languages { name } } }",
    "variables": {
      "code": "US"
    }
  }
}
```

### Complex Query with Multiple Variables

```json
{
  "tool": "graphql_query",
  "arguments": {
    "query": "query GetCountries($filter: CountryFilterInput) { countries(filter: $filter) { name code continent { name } } }",
    "variables": {
      "filter": {
        "continent": {
          "eq": "NA"
        }
      }
    }
  }
}
```

## Security and Rate Limiting

### Setting Query Limits

```json
{
  "tool": "graphql_configure",
  "arguments": {
    "endpoint": "https://api.example.com/graphql",
    "maxDepth": 3,
    "maxComplexity": 20,
    "timeout": 10000
  }
}
```

### Disabling Specific Resolvers

```json
{
  "tool": "graphql_configure",
  "arguments": {
    "endpoint": "https://api.example.com/graphql",
    "disabledResolvers": [
      "sensitiveUserData",
      "adminOnlyField",
      "expensiveComputation"
    ]
  }
}
```

## Working with Authentication

### API Key Authentication

```json
{
  "tool": "graphql_configure",
  "arguments": {
    "endpoint": "https://api.example.com/graphql",
    "headers": {
      "X-API-Key": "your-api-key-here",
      "User-Agent": "GraphQL-MCP/1.0.0"
    }
  }
}
```

### Bearer Token Authentication

```json
{
  "tool": "graphql_configure",
  "arguments": {
    "endpoint": "https://api.github.com/graphql",
    "headers": {
      "Authorization": "Bearer ghp_your_github_token_here",
      "User-Agent": "GraphQL-MCP/1.0.0"
    }
  }
}
```

### Custom Headers

```json
{
  "tool": "graphql_configure",
  "arguments": {
    "endpoint": "https://api.example.com/graphql",
    "headers": {
      "Authorization": "Bearer token123",
      "X-Custom-Header": "custom-value",
      "Accept": "application/json",
      "Content-Type": "application/json"
    }
  }
}
```

## Error Handling

### Handling Query Errors

The server automatically handles GraphQL errors and returns them in a structured format:

```json
{
  "tool": "graphql_query",
  "arguments": {
    "query": "query { nonExistentField }"
  }
}
```

Response:
```json
{
  "errors": [
    {
      "message": "Cannot query field 'nonExistentField' on type 'Query'",
      "extensions": {
        "code": "GRAPHQL_ERROR"
      }
    }
  ]
}
```

### Handling Configuration Errors

```json
{
  "tool": "graphql_configure",
  "arguments": {
    "endpoint": "not-a-valid-url"
  }
}
```

Response:
```json
{
  "error": "Configuration failed: GraphQL endpoint must be a valid URL"
}
```

## Debugging and Monitoring

### Check Current Status

```json
{
  "tool": "graphql_status"
}
```

Response:
```json
{
  "configured": true,
  "endpoint": "https://api.example.com/graphql",
  "timeout": 30000,
  "maxDepth": 10,
  "maxComplexity": 100,
  "disabledResolvers": ["sensitiveField"],
  "headersCount": 2
}
```

### Enable Debug Logging

Set the `DEBUG` environment variable:

```bash
DEBUG=true npm start
```

## Best Practices

### 1. Start Simple

Begin with basic queries and gradually add complexity:

```json
// Start with this
{ "tool": "graphql_query", "arguments": { "query": "query { __typename }" } }

// Then move to this
{ "tool": "graphql_query", "arguments": { "query": "query { users { id name } }" } }

// Finally add variables and fragments
{ "tool": "graphql_query", "arguments": { "query": "query GetUser($id: ID!) { user(id: $id) { ...UserFragment } } fragment UserFragment on User { id name email }", "variables": { "id": "123" } } }
```

### 2. Use Schema Introspection

Always introspect the schema first to understand the available data:

```json
{ "tool": "graphql_introspect" }
```

### 3. Set Appropriate Limits

Configure security limits based on your use case:

```json
{
  "tool": "graphql_configure",
  "arguments": {
    "endpoint": "https://api.example.com/graphql",
    "maxDepth": 5,        // Adjust based on your schema depth
    "maxComplexity": 100, // Adjust based on your performance needs
    "timeout": 30000      // 30 seconds is usually sufficient
  }
}
```

### 4. Handle Sensitive Data

Use the `disabledResolvers` feature to prevent access to sensitive fields:

```json
{
  "tool": "graphql_configure",
  "arguments": {
    "endpoint": "https://api.example.com/graphql",
    "disabledResolvers": [
      "password",
      "privateKey",
      "internalNotes",
      "adminOnlyData"
    ]
  }
}
```

### 5. Use Operation Names

For complex queries, always use operation names:

```json
{
  "tool": "graphql_query",
  "arguments": {
    "query": "query GetUserProfile($userId: ID!) { user(id: $userId) { name email } }",
    "variables": { "userId": "123" },
    "operationName": "GetUserProfile"
  }
}
```

## Troubleshooting

### Common Issues

1. **Invalid Endpoint**: Ensure the endpoint URL is correct and accessible
2. **Authentication Errors**: Verify your tokens and API keys are valid
3. **Query Complexity**: Reduce query depth or complexity if hitting limits
4. **Network Timeouts**: Increase the timeout value for slow APIs

### Getting Help

- Check the server logs for detailed error messages
- Use the `graphql_status` tool to verify your configuration
- Try simpler queries first to isolate issues
- Consult the API documentation for the GraphQL endpoint you're using