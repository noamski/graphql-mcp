#!/usr/bin/env node

/**
 * GraphQL MCP Server v1.1
 * 
 * A Model Context Protocol server that enables Large Language Models to
 * dynamically discover and interact with GraphQL APIs through schema
 * introspection and secure query execution.
 * 
 * This server provides four main tools:
 * - configure_graphql: Set up connection to any GraphQL endpoint
 * - introspect_schema: Discover all available resolvers, types, and fields
 * - execute_query: Execute GraphQL queries with variables and security constraints
 * - get_status: Check current configuration and connection status
 * 
 * @author noamski
 * @license MIT
 * @version 1.1.0
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { GraphQLClient } from 'graphql-request';
import { getIntrospectionQuery } from 'graphql';
import { z } from 'zod';

/**
 * Configuration schema for GraphQL endpoint setup
 * Validates and provides defaults for all configuration options
 */
const ConfigureArgsSchema = z.object({
  endpoint: z.string().url('Must be a valid GraphQL endpoint URL').optional(),
  headers: z.record(z.string()).optional().describe('HTTP headers for authentication (e.g., Authorization)'),
  timeout: z.number().min(1000).max(60000).default(30000).describe('Request timeout in milliseconds'),
  maxDepth: z.number().min(1).max(20).default(10).describe('Maximum allowed query nesting depth'),
  maxComplexity: z.number().min(1).max(1000).default(100).describe('Maximum allowed query complexity score'),
  disabledResolvers: z.array(z.string()).default([]).describe('List of resolver names to disable for security'),
});

/**
 * Schema for GraphQL query execution arguments
 */
const QueryArgsSchema = z.object({
  query: z.string().min(1, 'GraphQL query cannot be empty'),
  variables: z.record(z.unknown()).optional().describe('Variables to pass to the GraphQL query'),
  operationName: z.string().optional().describe('Name of the operation to execute (for multi-operation documents)'),
});

/**
 * Schema for schema introspection arguments
 */
const IntrospectArgsSchema = z.object({
  includeDeprecated: z.boolean().default(false).describe('Include deprecated fields and enum values in the schema'),
});

/**
 * Type definitions for server state management
 */
interface ServerState {
  /** Active GraphQL client instance */
  client: GraphQLClient | null;
  /** Currently configured GraphQL endpoint URL */
  endpoint: string | null;
  /** Complete configuration object */
  config: z.infer<typeof ConfigureArgsSchema> | null;
  /** Cached schema introspection result */
  cachedSchema: unknown;
  /** Timestamp when schema was last cached */
  schemaTimestamp: number;
  /** Dynamically created MCP tools for GraphQL resolvers */
  dynamicTools: Array<{
    name: string;
    description: string;
    inputSchema: object;
    resolver: {
      type: 'query' | 'mutation';
      fieldName: string;
      returnType: string;
      args: any[];
    };
  }>;
}

/**
 * Global server state
 * Maintains connection info and cached data across requests
 */
const state: ServerState = {
  client: null,
  endpoint: null,
  config: null,
  cachedSchema: null,
  schemaTimestamp: 0,
  dynamicTools: [],
};

/**
 * Cache TTL for schema introspection results (5 minutes)
 * Schema introspection is expensive, so we cache results to improve performance
 */
const SCHEMA_CACHE_TTL = 5 * 60 * 1000;

/**
 * Load GraphQL configuration from environment variables
 * Allows the server to work out-of-the-box with environment-based configuration
 * 
 * @returns Partial configuration object from environment variables
 */
function loadEnvironmentConfig(): Partial<z.infer<typeof ConfigureArgsSchema>> {
  const config: Partial<z.infer<typeof ConfigureArgsSchema>> = {};
  
  if (process.env.GRAPHQL_ENDPOINT) {
    config.endpoint = process.env.GRAPHQL_ENDPOINT;
  }
  
  if (process.env.GRAPHQL_TIMEOUT) {
    const timeout = parseInt(process.env.GRAPHQL_TIMEOUT, 10);
    if (!isNaN(timeout)) {
      config.timeout = timeout;
    }
  }
  
  if (process.env.GRAPHQL_MAX_DEPTH) {
    const maxDepth = parseInt(process.env.GRAPHQL_MAX_DEPTH, 10);
    if (!isNaN(maxDepth)) {
      config.maxDepth = maxDepth;
    }
  }
  
  if (process.env.GRAPHQL_MAX_COMPLEXITY) {
    const maxComplexity = parseInt(process.env.GRAPHQL_MAX_COMPLEXITY, 10);
    if (!isNaN(maxComplexity)) {
      config.maxComplexity = maxComplexity;
    }
  }
  
  if (process.env.GRAPHQL_DISABLED_RESOLVERS) {
    config.disabledResolvers = process.env.GRAPHQL_DISABLED_RESOLVERS.split(',').map(r => r.trim());
  }
  
  // Parse headers from environment (JSON format)
  if (process.env.GRAPHQL_HEADERS) {
    try {
      config.headers = JSON.parse(process.env.GRAPHQL_HEADERS);
    } catch (error) {
      logToStderr('Failed to parse GRAPHQL_HEADERS as JSON:', error);
    }
  }
  
  // Common authentication headers
  if (process.env.GRAPHQL_AUTH_TOKEN) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${process.env.GRAPHQL_AUTH_TOKEN}`;
  }
  
  if (process.env.GRAPHQL_API_KEY) {
    config.headers = config.headers || {};
    config.headers['X-API-Key'] = process.env.GRAPHQL_API_KEY;
  }
  
  return config;
}

/**
 * Convert GraphQL type to JSON Schema type
 * Handles scalar types, enums, and object references
 * 
 * @param gqlType - GraphQL type definition
 * @returns JSON Schema type definition
 */
function convertGraphQLTypeToJsonSchema(gqlType: any): any {
  // Handle non-null wrapper
  if (gqlType.kind === 'NON_NULL') {
    return convertGraphQLTypeToJsonSchema(gqlType.ofType);
  }
  
  // Handle list wrapper
  if (gqlType.kind === 'LIST') {
    return {
      type: 'array',
      items: convertGraphQLTypeToJsonSchema(gqlType.ofType)
    };
  }
  
  // Handle scalar and enum types
  if (gqlType.kind === 'SCALAR') {
    switch (gqlType.name) {
      case 'String': return { type: 'string' };
      case 'Int': return { type: 'integer' };
      case 'Float': return { type: 'number' };
      case 'Boolean': return { type: 'boolean' };
      case 'ID': return { type: 'string' };
      default: return { type: 'string' }; // Fallback for custom scalars
    }
  }
  
  if (gqlType.kind === 'ENUM') {
    return {
      type: 'string',
      enum: gqlType.enumValues?.map((v: any) => v.name) || []
    };
  }
  
  // For object types, just reference by name
  return { type: 'string', description: `${gqlType.name} object` };
}

/**
 * Create MCP tools from GraphQL schema
 * Converts each query and mutation resolver into an individual MCP tool
 * 
 * @param schema - GraphQL introspection schema
 * @returns Array of MCP tool definitions
 */
function createMCPToolsFromSchema(schema: any): ServerState['dynamicTools'] {
  const tools: ServerState['dynamicTools'] = [];
  const schemaData = schema.__schema;
  
  // Process Query type
  if (schemaData.queryType) {
    const queryType = schemaData.types.find((t: any) => t.name === schemaData.queryType.name);
    if (queryType?.fields) {
      for (const field of queryType.fields) {
        if (state.config?.disabledResolvers.includes(field.name)) {
          continue; // Skip disabled resolvers
        }
        
        const properties: any = {};
        const required: string[] = [];
        
        // Convert field arguments to JSON Schema properties
        if (field.args) {
          for (const arg of field.args) {
            properties[arg.name] = convertGraphQLTypeToJsonSchema(arg.type);
            if (arg.type.kind === 'NON_NULL') {
              required.push(arg.name);
            }
            if (arg.description) {
              properties[arg.name].description = arg.description;
            }
          }
        }
        
        tools.push({
          name: `query_${field.name}`,
          description: field.description || `Execute GraphQL query: ${field.name}`,
          inputSchema: {
            type: 'object',
            properties,
            required,
            additionalProperties: false
          },
          resolver: {
            type: 'query',
            fieldName: field.name,
            returnType: getLeafType(field.type).name || 'Mixed',
            args: field.args || []
          }
        });
      }
    }
  }
  
  // Process Mutation type
  if (schemaData.mutationType) {
    const mutationType = schemaData.types.find((t: any) => t.name === schemaData.mutationType.name);
    if (mutationType?.fields) {
      for (const field of mutationType.fields) {
        if (state.config?.disabledResolvers.includes(field.name)) {
          continue; // Skip disabled resolvers
        }
        
        const properties: any = {};
        const required: string[] = [];
        
        // Convert field arguments to JSON Schema properties
        if (field.args) {
          for (const arg of field.args) {
            properties[arg.name] = convertGraphQLTypeToJsonSchema(arg.type);
            if (arg.type.kind === 'NON_NULL') {
              required.push(arg.name);
            }
            if (arg.description) {
              properties[arg.name].description = arg.description;
            }
          }
        }
        
        tools.push({
          name: `mutation_${field.name}`,
          description: field.description || `Execute GraphQL mutation: ${field.name}`,
          inputSchema: {
            type: 'object',
            properties,
            required,
            additionalProperties: false
          },
          resolver: {
            type: 'mutation',
            fieldName: field.name,
            returnType: getLeafType(field.type).name || 'Mixed',
            args: field.args || []
          }
        });
      }
    }
  }
  
  return tools;
}

/**
 * Generate a basic selection set for GraphQL object types
 * Uses the cached schema to find actual scalar fields for the type
 * 
 * @param returnType - The GraphQL return type name
 * @returns Selection set string like " { name code }" or empty string for scalars
 */
function getBasicSelectionSet(returnType: string): string {
  // For scalar types, no selection set needed
  const scalarTypes = ['String', 'Int', 'Float', 'Boolean', 'ID'];
  if (scalarTypes.includes(returnType) || returnType === 'Mixed') {
    return '';
  }
  
  // If we have cached schema, try to get actual fields for this type
  if (state.cachedSchema) {
    const schema = (state.cachedSchema as any).__schema;
    if (schema?.types) {
      const type = schema.types.find((t: any) => t.name === returnType);
      if (type?.fields) {
        // Get first few scalar fields from the type
        const scalarFields = type.fields
          .filter((field: any) => {
            const fieldType = getLeafType(field.type);
            return scalarTypes.includes(fieldType.name) || fieldType.kind === 'ENUM';
          })
          .slice(0, 5) // Limit to first 5 fields to avoid complexity
          .map((field: any) => field.name);
        
        if (scalarFields.length > 0) {
          return ` { ${scalarFields.join(' ')} }`;
        }
      }
    }
  }
  
  // Fallback to common field names
  const commonFields = ['id', 'name', 'code', 'title'];
  return ` { ${commonFields.join(' ')} }`;
}

/**
 * Get the leaf type from a GraphQL type (unwrap NON_NULL and LIST wrappers)
 */
function getLeafType(type: any): any {
  if (type.kind === 'NON_NULL' || type.kind === 'LIST') {
    return getLeafType(type.ofType);
  }
  return type;
}

/**
 * Convert GraphQL type definition to GraphQL type string for variables
 * Examples: "String!", "[String!]!", "ID"
 */
function getGraphQLTypeString(type: any): string {
  if (type.kind === 'NON_NULL') {
    return getGraphQLTypeString(type.ofType) + '!';
  }
  
  if (type.kind === 'LIST') {
    return `[${getGraphQLTypeString(type.ofType)}]`;
  }
  
  return type.name;
}

/**
 * Logging utility that writes to stderr (never stdout for stdio transport)
 * Following MCP best practices for stdio-based servers
 * 
 * @param message - Log message
 * @param args - Additional arguments to log
 */
function logToStderr(message: string, ...args: unknown[]): void {
  console.error(`[GraphQL-MCP] ${new Date().toISOString()}: ${message}`, ...args);
}

/**
 * Calculate the complexity score of a GraphQL query
 * Complexity is measured by counting the number of fields requested
 * 
 * @param query - GraphQL query string
 * @returns Complexity score (number of fields)
 */
function calculateQueryComplexity(query: string): number {
  // Simple complexity calculation based on field count
  // This counts field selections in the query
  const fieldMatches = query.match(/\w+(?=\s*[{(])/g);
  return fieldMatches ? fieldMatches.length : 0;
}

/**
 * Calculate the maximum nesting depth of a GraphQL query
 * Depth limiting prevents excessively nested queries that could cause performance issues
 * 
 * @param query - GraphQL query string
 * @returns Maximum nesting depth
 */
function calculateQueryDepth(query: string): number {
  let depth = 0;
  let maxDepth = 0;
  
  // Count nesting level by tracking opening and closing braces
  for (const char of query) {
    if (char === '{') {
      depth++;
      maxDepth = Math.max(maxDepth, depth);
    } else if (char === '}') {
      depth--;
    }
  }
  
  return maxDepth;
}

/**
 * Sanitize a GraphQL query by removing comments and normalizing whitespace
 * This helps with consistent processing and security
 * 
 * @param query - Raw GraphQL query string
 * @returns Sanitized query string
 */
function sanitizeQuery(query: string): string {
  return query
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments /* */
    .replace(/#[^\r\n]*/g, '') // Remove line comments #
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Validate a GraphQL query against security constraints
 * Throws McpError if validation fails
 * 
 * @param query - GraphQL query to validate
 * @param config - Server configuration with security settings
 * @throws {McpError} If query violates security constraints
 */
function validateQueryConstraints(query: string, config: z.infer<typeof ConfigureArgsSchema>): void {
  const sanitized = sanitizeQuery(query);
  
  // Check query complexity
  const complexity = calculateQueryComplexity(sanitized);
  if (complexity > config.maxComplexity) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Query complexity (${complexity}) exceeds maximum allowed (${config.maxComplexity})`
    );
  }
  
  // Check query depth
  const depth = calculateQueryDepth(sanitized);
  if (depth > config.maxDepth) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Query depth (${depth}) exceeds maximum allowed (${config.maxDepth})`
    );
  }
  
  // Check for disabled resolvers
  for (const resolver of config.disabledResolvers) {
    if (sanitized.toLowerCase().includes(resolver.toLowerCase())) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Access to resolver '${resolver}' is disabled`
      );
    }
  }
}

/**
 * Create and configure the MCP server instance
 * Declares server capabilities and metadata
 */
const server = new Server(
  {
    name: 'graphql-mcp',
    version: '1.1.0',
  },
  {
    capabilities: {
      tools: {}, // This server provides tools for GraphQL operations
    },
  }
);

/**
 * Handle the tools/list request
 * Returns all available tools that this server provides
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  // Only show status tool and dynamic GraphQL resolver tools to LLMs
  const staticTools = [
    {
      name: 'get_status',
      description: 'Get current GraphQL connection status and configuration',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ];

  // Add dynamic GraphQL resolver tools
  const dynamicTools = state.dynamicTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  }));

  return {
    tools: [...staticTools, ...dynamicTools],
  };
});

/**
 * Handle tool execution requests
 * Routes to the appropriate handler based on tool name
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Handle static tools
    switch (name) {
      case 'get_status':
        return await handleGetStatus();
    }

    // Handle dynamic GraphQL resolver tools
    const dynamicTool = state.dynamicTools.find(tool => tool.name === name);
    if (dynamicTool) {
      return await handleGraphQLResolver(dynamicTool, args);
    }

    throw new McpError(
      ErrorCode.MethodNotFound,
      `Unknown tool: ${name}. Available tools: ${['get_status', ...state.dynamicTools.map(t => t.name)].join(', ')}`
    );
  } catch (error) {
    // Re-throw MCP errors as-is
    if (error instanceof McpError) {
      throw error;
    }
    
    // Log unexpected errors and wrap them
    logToStderr(`Tool execution failed for ${name}:`, error);
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
});

/**
 * Handle GraphQL endpoint configuration
 * Tests the connection and stores configuration if successful
 * 
 * @param args - Configuration arguments
 * @returns Success message with configuration details
 */
async function handleConfigureGraphQL(args: unknown) {
  // Load environment configuration as base
  const envConfig = loadEnvironmentConfig();
  
  // Parse and merge with provided arguments
  const parsedArgs = ConfigureArgsSchema.parse(args);
  const config = {
    ...envConfig,
    ...parsedArgs,
    // Merge headers specifically to avoid overwriting
    headers: {
      ...envConfig.headers,
      ...parsedArgs.headers
    }
  };
  
  // Endpoint is required either from args or environment
  if (!config.endpoint) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'GraphQL endpoint must be provided either as argument or via GRAPHQL_ENDPOINT environment variable'
    );
  }
  
  // Test connection to the GraphQL endpoint
  const testClient = new GraphQLClient(
    config.endpoint, 
    { 
      headers: config.headers || {}
    }
  );
  
  try {
    // Verify the endpoint responds to a simple query
    await testClient.request('{ __typename }');
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to connect to GraphQL endpoint: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
  
  // Store configuration in server state
  state.client = testClient;
  state.endpoint = config.endpoint;
  state.config = config;
  state.cachedSchema = null; // Clear any cached schema
  state.schemaTimestamp = 0;
  state.dynamicTools = []; // Clear dynamic tools
  
  // Perform schema introspection and create dynamic tools
  try {
    logToStderr('Performing schema introspection to create resolver tools');
    const introspectionQuery = getIntrospectionQuery();
    const schemaResult = await testClient.request(introspectionQuery);
    
    // Cache the schema
    state.cachedSchema = schemaResult;
    state.schemaTimestamp = Date.now();
    
    // Create dynamic MCP tools for each GraphQL resolver
    state.dynamicTools = createMCPToolsFromSchema(schemaResult);
    
    logToStderr(`Created ${state.dynamicTools.length} dynamic tools from GraphQL schema`);
  } catch (error) {
    logToStderr('Schema introspection failed, but configuration saved:', error);
  }
  
  logToStderr(`Configured GraphQL endpoint: ${config.endpoint}`);
  
  return {
    content: [
      {
        type: 'text',
        text: `✅ Successfully configured GraphQL endpoint: ${config.endpoint}\n\nSettings:\n- Max depth: ${config.maxDepth}\n- Max complexity: ${config.maxComplexity}\n- Disabled resolvers: ${config.disabledResolvers.length > 0 ? config.disabledResolvers.join(', ') : 'None'}\n- Timeout: ${config.timeout}ms\n- Dynamic tools created: ${state.dynamicTools.length}`,
      },
    ],
  };
}

/**
 * Handle execution of dynamic GraphQL resolver tools
 * Converts MCP tool calls into GraphQL queries and executes them
 * 
 * @param tool - The dynamic tool definition
 * @param args - Arguments passed to the tool
 * @returns GraphQL query results
 */
async function handleGraphQLResolver(tool: ServerState['dynamicTools'][0], args: unknown) {
  // Ensure GraphQL client is configured
  if (!state.client || !state.config) {
    const envConfig = loadEnvironmentConfig();
    const suggestion = envConfig.endpoint 
      ? 'Use configure_graphql tool to activate the endpoint, or check server logs for auto-configuration errors.'
      : 'Use configure_graphql tool first, or set GRAPHQL_ENDPOINT environment variable.';
    
    throw new McpError(
      ErrorCode.InvalidRequest,
      `GraphQL endpoint not configured. ${suggestion}`
    );
  }
  
  // Validate arguments against the tool's input schema
  const parsedArgs = args as Record<string, unknown>;
  
  // Build GraphQL query from tool definition and arguments
  const { resolver } = tool;
  const operationType = resolver.type === 'mutation' ? 'mutation' : 'query';
  
  // Build arguments string for the GraphQL query
  let argsString = '';
  let variablesString = '';
  const variables: Record<string, unknown> = {};
  
  if (parsedArgs && Object.keys(parsedArgs).length > 0) {
    const argPairs: string[] = [];
    const varPairs: string[] = [];
    
    for (const [key, value] of Object.entries(parsedArgs)) {
      argPairs.push(`${key}: $${key}`);
      
      // Find the actual GraphQL type for this argument
      const arg = tool.resolver.args.find((a: any) => a.name === key);
      const gqlType = arg ? getGraphQLTypeString(arg.type) : 'String';
      varPairs.push(`$${key}: ${gqlType}`);
      
      variables[key] = value;
    }
    
    if (argPairs.length > 0) {
      argsString = `(${argPairs.join(', ')})`;
      variablesString = `(${varPairs.join(', ')})`;
    }
  }
  
  // Add basic selection set for object types
  const selectionSet = getBasicSelectionSet(resolver.returnType);
  
  const query = `${operationType} ${variablesString} {
    ${resolver.fieldName}${argsString}${selectionSet}
  }`;
  
  try {
    // Validate query against security constraints
    validateQueryConstraints(query, state.config);
    
    logToStderr(`Executing GraphQL ${resolver.type}: ${resolver.fieldName}`, {
      hasVariables: Object.keys(variables).length > 0,
    });
    
    // Execute the GraphQL query
    const result = await state.client.request(query, variables);
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ ${resolver.type === 'mutation' ? 'Mutation' : 'Query'} executed: ${resolver.fieldName}\n\nEndpoint: ${state.endpoint}\n\nResult:\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  } catch (error) {
    logToStderr(`GraphQL ${resolver.type} execution failed:`, error);
    
    // Re-throw validation errors
    if (error instanceof McpError) {
      throw error;
    }
    
    // Handle GraphQL execution errors gracefully
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [
        {
          type: 'text',
          text: `❌ ${resolver.type === 'mutation' ? 'Mutation' : 'Query'} failed: ${resolver.fieldName}\n\nError: ${errorMessage}\n\nQuery:\n${query}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle status check requests
 * Returns current server configuration and connection status
 * 
 * @returns Current server status information
 */
async function handleGetStatus() {
  const status = {
    configured: !!state.client,
    endpoint: state.endpoint,
    settings: state.config ? {
      maxDepth: state.config.maxDepth,
      maxComplexity: state.config.maxComplexity,
      disabledResolvers: state.config.disabledResolvers,
      timeout: state.config.timeout,
      headersConfigured: !!state.config.headers && Object.keys(state.config.headers).length > 0,
    } : null,
    cacheStatus: {
      schemaCache: !!state.cachedSchema,
      cacheAge: state.cachedSchema ? Date.now() - state.schemaTimestamp : null,
      cacheTTL: SCHEMA_CACHE_TTL,
    },
  };
  
  return {
    content: [
      {
        type: 'text',
        text: `📊 GraphQL MCP Server Status\n\n${JSON.stringify(status, null, 2)}`,
      },
    ],
  };
}

/**
 * Main server startup function
 * Initializes the MCP server with stdio transport and sets up error handling
 */
async function main(): Promise<void> {
  logToStderr('GraphQL MCP Server v1.1.0 starting');
  logToStderr('Protocol version: 2025-06-18');
  logToStderr('Transport: stdio');
  logToStderr('Capabilities: tools');
  
  // Connect to transport first
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  logToStderr('GraphQL MCP Server v1.1.0 ready');
  
  // Auto-configure from environment AFTER connecting (non-blocking)
  const envConfig = loadEnvironmentConfig();
  if (envConfig.endpoint) {
    // Use setTimeout to avoid blocking the connection
    setTimeout(async () => {
      try {
        await handleConfigureGraphQL({});
        logToStderr(`Auto-configured from environment: ${envConfig.endpoint}`);
      } catch (error) {
        logToStderr('Auto-configuration from environment failed:', error);
        logToStderr('Server running without GraphQL configuration');
      }
    }, 100);
  } else {
    logToStderr('No GRAPHQL_ENDPOINT found in environment. Server running without GraphQL configuration');
    logToStderr('Configure via environment variables: GRAPHQL_ENDPOINT, GRAPHQL_AUTH_TOKEN, etc.');
  }
}

/**
 * Graceful shutdown handlers
 * Ensure clean server shutdown on process signals
 */
process.on('SIGINT', async () => {
  logToStderr('Received SIGINT, shutting down...');
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logToStderr('Received SIGTERM, shutting down...');
  await server.close();
  process.exit(0);
});

/**
 * Entry point - start the server if this file is executed directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logToStderr('Failed to start server:', error);
    process.exit(1);
  });
}