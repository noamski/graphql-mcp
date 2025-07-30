#!/usr/bin/env node

/**
 * Example MCP Client connecting to GraphQL MCP Server
 * 
 * This example shows how to:
 * 1. Connect to the GraphQL MCP server
 * 2. Configure authentication
 * 3. Discover dynamic GraphQL resolver tools
 * 4. Call GraphQL resolvers directly as MCP tools
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function main() {
  console.log('🚀 Starting MCP Client Example');

  // Create MCP client
  const client = new Client({
    name: 'graphql-mcp-example',
    version: '1.0.0'
  }, {
    capabilities: { tools: {} }
  });

  // Connect to GraphQL MCP server via stdio
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/server.js']
  });

  try {
    await client.connect(transport);
    console.log('✅ Connected to GraphQL MCP Server');

    // Step 1: Configure GraphQL endpoint with authentication
    console.log('\n📡 Configuring GitHub GraphQL API...');
    const configResult = await client.callTool({
      name: 'configure_graphql',
      arguments: {
        endpoint: 'https://api.github.com/graphql',
        headers: {
          'Authorization': 'Bearer ghp_your_github_token_here',
          'User-Agent': 'GraphQL-MCP-Client/1.0'
        },
        maxDepth: 5,
        maxComplexity: 50,
        disabledResolvers: [] // No disabled resolvers for this example
      }
    });
    
    console.log('Configuration result:', configResult.content[0].text);

    // Step 2: List all available tools (should now include dynamic GraphQL tools)
    console.log('\n🔍 Discovering available tools...');
    const { tools } = await client.listTools();
    
    console.log(`Found ${tools.length} tools:`);
    tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });

    // Step 3: Call GraphQL resolvers directly as MCP tools
    console.log('\n🎯 Calling GraphQL resolvers as MCP tools...');

    // Example 1: Get viewer information (if query_viewer exists)
    const viewerTool = tools.find(t => t.name === 'query_viewer');
    if (viewerTool) {
      console.log('\n👤 Getting viewer information...');
      const viewerResult = await client.callTool({
        name: 'query_viewer',
        arguments: {} // viewer query typically has no arguments
      });
      console.log('Viewer result:', viewerResult.content[0].text);
    }

    // Example 2: Get user information (if query_user exists)
    const userTool = tools.find(t => t.name === 'query_user');
    if (userTool) {
      console.log('\n👤 Getting user information for "torvalds"...');
      const userResult = await client.callTool({
        name: 'query_user',
        arguments: {
          login: 'torvalds'
        }
      });
      console.log('User result:', userResult.content[0].text);
    }

    // Example 3: Get repository information (if query_repository exists)
    const repoTool = tools.find(t => t.name === 'query_repository');
    if (repoTool) {
      console.log('\n📦 Getting repository information for "facebook/react"...');
      const repoResult = await client.callTool({
        name: 'query_repository',
        arguments: {
          owner: 'facebook',
          name: 'react'
        }
      });
      console.log('Repository result:', repoResult.content[0].text);
    }

    // Step 4: Check server status
    console.log('\n📊 Checking server status...');
    const statusResult = await client.callTool({
      name: 'get_status',
      arguments: {}
    });
    console.log('Status:', statusResult.content[0].text);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n✅ Client disconnected');
  }
}

// Handle process exit
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  process.exit(0);
});

main().catch(console.error);