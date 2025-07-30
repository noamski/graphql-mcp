#!/usr/bin/env node

/**
 * Working Example: Countries GraphQL API
 * 
 * This example uses the public Countries GraphQL API to demonstrate:
 * 1. Connecting to a real GraphQL API without authentication
 * 2. Auto-discovering GraphQL resolvers as MCP tools
 * 3. Calling GraphQL resolvers directly
 * 
 * API: https://countries.trevorblades.com/
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function main() {
  console.log('🌍 Starting Countries GraphQL MCP Example');

  // Create MCP client
  const client = new Client({
    name: 'countries-mcp-example',
    version: '1.0.0'
  }, {
    capabilities: { tools: {} }
  });

  // Connect to GraphQL MCP server via stdio with environment configuration
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/server.js'],
    env: {
      ...process.env,
      GRAPHQL_ENDPOINT: 'https://countries.trevorblades.com/',
      GRAPHQL_HEADERS: JSON.stringify({
        'User-Agent': 'GraphQL-MCP-Example/1.0'
      }),
      GRAPHQL_MAX_DEPTH: '5',
      GRAPHQL_MAX_COMPLEXITY: '100'
    }
  });

  try {
    await client.connect(transport);
    console.log('✅ Connected to GraphQL MCP Server');

    // Step 1: Wait for auto-configuration and list discovered tools
    console.log('\n🔍 Discovering auto-configured GraphQL resolver tools...');
    const { tools } = await client.listTools();
    
    const dynamicTools = tools.filter(t => t.name.startsWith('query_') || t.name.startsWith('mutation_'));
    console.log(`\nFound ${dynamicTools.length} GraphQL resolver tools:`);
    dynamicTools.forEach(tool => {
      console.log(`  📋 ${tool.name}: ${tool.description}`);
      if (tool.inputSchema?.properties) {
        const params = Object.keys(tool.inputSchema.properties);
        if (params.length > 0) {
          console.log(`      Parameters: ${params.join(', ')}`);
        }
      }
    });

    // Step 2: Call GraphQL resolvers directly as MCP tools
    console.log('\n🎯 Testing GraphQL resolver tools...');

    // Example 1: Get all countries (if query_countries exists)
    const countriesTool = tools.find(t => t.name === 'query_countries');
    if (countriesTool) {
      console.log('\n🌎 Getting all countries...');
      const countriesResult = await client.callTool({
        name: 'query_countries',
        arguments: {}
      });
      console.log('Countries result (first 200 chars):', 
        countriesResult.content[0].text.substring(0, 200) + '...');
    }

    // Example 2: Get a specific country (if query_country exists)
    const countryTool = tools.find(t => t.name === 'query_country');
    if (countryTool) {
      console.log('\n🇺🇸 Getting information for USA...');
      const countryResult = await client.callTool({
        name: 'query_country',
        arguments: {
          code: 'US'
        }
      });
      console.log('USA result:', countryResult.content[0].text);
    }

    // Example 3: Get continents (if query_continents exists)
    const continentsTool = tools.find(t => t.name === 'query_continents');
    if (continentsTool) {
      console.log('\n🌍 Getting all continents...');
      const continentsResult = await client.callTool({
        name: 'query_continents',
        arguments: {}
      });
      console.log('Continents result:', continentsResult.content[0].text);
    }

    // Example 4: Get languages (if query_languages exists)
    const languagesTool = tools.find(t => t.name === 'query_languages');
    if (languagesTool) {
      console.log('\n🗣️ Getting all languages...');
      const languagesResult = await client.callTool({
        name: 'query_languages',
        arguments: {}
      });
      console.log('Languages result (first 300 chars):', 
        languagesResult.content[0].text.substring(0, 300) + '...');
    }

    // Step 3: Check server status
    console.log('\n📊 Final server status...');
    const statusResult = await client.callTool({
      name: 'get_status',
      arguments: {}
    });
    console.log('Status:', statusResult.content[0].text);

    console.log('\n🎉 Example completed successfully!');
    console.log('\n💡 Key takeaways:');
    console.log('   - GraphQL schema was automatically introspected');
    console.log('   - Each GraphQL resolver became an individual MCP tool');
    console.log('   - No manual GraphQL query writing required');
    console.log('   - Tools have proper JSON Schema for arguments');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    console.error('\n🔧 Troubleshooting:');
    console.error('   - Make sure you built the server: npm run build');
    console.error('   - Check internet connection for API access');
  } finally {
    await client.close();
    console.log('\n✅ Client disconnected');
  }
}

// Handle process exit gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  process.exit(0);
});

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});