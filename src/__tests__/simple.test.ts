import { z } from 'zod';

const GraphQLConfigSchema = z.object({
  endpoint: z.string().url(),
  headers: z.record(z.string()).optional(),
  timeout: z.number().min(1000).max(60000).default(30000),
  maxDepth: z.number().min(1).max(20).default(10),
  maxComplexity: z.number().min(1).max(1000).default(100),
  disabledResolvers: z.array(z.string()).default([]),
});

describe('GraphQL MCP Server v2.0', () => {
  it('should validate GraphQL configuration schema', () => {
    const validConfig = {
      endpoint: 'https://api.example.com/graphql',
      headers: { 'Authorization': 'Bearer token' },
      timeout: 30000,
      disabledResolvers: [],
      maxDepth: 10,
      maxComplexity: 100,
    };

    const result = GraphQLConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it('should reject invalid GraphQL configuration', () => {
    const invalidConfig = {
      endpoint: 'not-a-url',
    };

    const result = GraphQLConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });

  it('should apply default values for optional fields', () => {
    const minimalConfig = {
      endpoint: 'https://api.example.com/graphql',
    };

    const result = GraphQLConfigSchema.parse(minimalConfig);
    expect(result.timeout).toBe(30000);
    expect(result.maxDepth).toBe(10);
    expect(result.maxComplexity).toBe(100);
    expect(result.disabledResolvers).toEqual([]);
  });
});