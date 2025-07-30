#!/usr/bin/env node

/**
 * Complete MCP client example showing proper discovery and usage patterns
 * Follows MCP 2025 best practices for client implementation
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function runMCPClientExample() {
  console.log('🚀 MCP Client Example - GraphQL Server Discovery\n');

  // Step 1: Create MCP client with proper capabilities
  const client = new Client(
    {
      name: 'graphql-mcp-example-client',
      version: '2.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Step 2: Connect to server using stdio transport
  console.log('📡 Connecting to GraphQL MCP Server...');
  
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['../dist/server.js'],
  });

  await client.connect(transport);
  console.log('✅ Connected to GraphQL MCP Server v2.0.0\n');

  try {
    // Step 3: Discover available tools
    console.log('🔍 Discovering available tools...');
    const { tools } = await client.listTools();
    
    console.log(`Found ${tools.length} tools:`);
    tools.forEach((tool, i) => {
      console.log(`  ${i + 1}. ${tool.name}`);
      console.log(`     ${tool.description}`);
    });
    console.log();

    // Step 4: Configure GraphQL endpoint
    console.log('⚙️  Configuring GraphQL endpoint...');
    const configResult = await client.callTool({
      name: 'configure_graphql',
      arguments: {
        endpoint: 'https://countries.trevorblades.com/',
        maxDepth: 5,
        maxComplexity: 50,
        timeout: 30000,
        disabledResolvers: [], // No restrictions for this demo
      },
    });

    console.log('Configuration result:');
    console.log(configResult.content[0].text);
    console.log();

    // Step 5: Introspect GraphQL schema - this is how clients discover ALL resolvers
    console.log('🔬 Introspecting GraphQL schema (discovering all resolvers)...');
    const schemaResult = await client.callTool({
      name: 'introspect_schema',
      arguments: {
        includeDeprecated: false,
      },
    });

    // Parse the schema response
    const schemaText = schemaResult.content[0].text;
    const fullSchemaMatch = schemaText.match(/Full Schema:\n([\s\S]*)/);
    
    if (fullSchemaMatch) {
      const schema = JSON.parse(fullSchemaMatch[1]);
      const queryType = schema.__schema.types.find(t => t.name === 'Query');
      
      console.log('📊 Schema Discovery Results:');
      console.log(`- Total types: ${schema.__schema.types.length}`);
      console.log(`- Query resolvers: ${queryType?.fields?.length || 0}`);
      console.log();

      if (queryType?.fields) {
        console.log('🎯 Available Query Resolvers:');
        queryType.fields.forEach(field => {
          console.log(`  • ${field.name}: ${field.type.name || field.type.kind}`);
          if (field.args?.length > 0) {
            field.args.forEach(arg => {
              console.log(`    - ${arg.name}: ${arg.type.name || arg.type.kind}${arg.defaultValue ? ` = ${arg.defaultValue}` : ''}`);
            });
          }
        });
        console.log();
      }

      // Show available types
      const objectTypes = schema.__schema.types.filter(t => 
        t.kind === 'OBJECT' && 
        !t.name.startsWith('__') && 
        t.name !== 'Query'
      );
      
      console.log(`📋 Available GraphQL Types (showing first 5 of ${objectTypes.length}):`);
      objectTypes.slice(0, 5).forEach(type => {
        console.log(`  • ${type.name} (${type.fields?.length || 0} fields)`);
      });
      console.log();
    }

    // Step 6: Execute GraphQL queries using discovered schema
    console.log('🚀 Executing GraphQL queries...');

    // Query 1: Simple query
    console.log('📍 Query 1: Getting countries list...');
    const countriesResult = await client.callTool({
      name: 'execute_query',
      arguments: {
        query: 'query { countries { name code emoji } }',
      },
    });

    if (countriesResult.content[0].text.includes('successfully')) {
      const resultText = countriesResult.content[0].text;
      const resultMatch = resultText.match(/Result:\n([\s\S]*)/);
      if (resultMatch) {
        const data = JSON.parse(resultMatch[1]);
        console.log(`✅ Retrieved ${data.countries.length} countries`);
        console.log('Sample countries:', data.countries.slice(0, 3).map(c => `${c.emoji} ${c.name}`).join(', '));
      }
    }
    console.log();

    // Query 2: Query with variables
    console.log('🇺🇸 Query 2: Getting specific country with variables...');
    const countryResult = await client.callTool({
      name: 'execute_query',
      arguments: {
        query: `
          query GetCountryDetails($code: ID!) {
            country(code: $code) {
              name
              code
              emoji
              capital
              currency
              phone
              languages {
                name
                native
              }
            }
          }
        `,
        variables: {
          code: 'US'
        },
        operationName: 'GetCountryDetails'
      },
    });

    if (countryResult.content[0].text.includes('successfully')) {
      const resultText = countryResult.content[0].text;
      const resultMatch = resultText.match(/Result:\n([\s\S]*)/);
      if (resultMatch) {
        const data = JSON.parse(resultMatch[1]);
        const country = data.country;
        console.log(`✅ Country Details:`);
        console.log(`  Name: ${country.name} ${country.emoji}`);
        console.log(`  Capital: ${country.capital}`);
        console.log(`  Currency: ${country.currency}`);
        console.log(`  Phone: ${country.phone}`);
        console.log(`  Languages: ${country.languages.map(l => l.name).join(', ')}`);
      }
    }
    console.log();

    // Query 3: Query with filtering
    console.log('🌍 Query 3: Filtering countries by continent...');
    const filteredResult = await client.callTool({
      name: 'execute_query',
      arguments: {
        query: `
          query GetEuropeanCountries {
            countries(filter: { continent: { eq: "EU" } }) {
              name
              code
              emoji
            }
          }
        `,
        operationName: 'GetEuropeanCountries'
      },
    });

    if (filteredResult.content[0].text.includes('successfully')) {
      const resultText = filteredResult.content[0].text;
      const resultMatch = resultText.match(/Result:\n([\s\S]*)/);
      if (resultMatch) {
        const data = JSON.parse(resultMatch[1]);
        console.log(`✅ Found ${data.countries.length} European countries`);
        console.log('Sample:', data.countries.slice(0, 5).map(c => `${c.emoji} ${c.name}`).join(', '));
      }
    }
    console.log();

    // Step 7: Check server status
    console.log('📊 Checking server status...');
    const statusResult = await client.callTool({
      name: 'get_status',
    });

    console.log('Server Status:');
    console.log(statusResult.content[0].text);
    console.log();

    // Step 8: Demonstrate security - try a complex query that should be rejected
    console.log('🔒 Testing security limits...');
    try {
      const complexQuery = `
        query TooComplex {
          ${'countries { continent { countries { continent { countries { name } } } } }'.repeat(10)}
        }
      `;
      
      await client.callTool({
        name: 'execute_query',
        arguments: {
          query: complexQuery,
        },
      });
    } catch (error) {
      console.log('✅ Security limits working - complex query rejected as expected');
    }

  } catch (error) {
    console.error('❌ Error during MCP operations:', error);
  } finally {
    // Clean up
    await client.close();
  }

  console.log('\n🎉 MCP Client Example Complete!');
  console.log('\n📋 What this demonstrates:');
  console.log('  ✅ Proper MCP client-server connection');
  console.log('  ✅ Tool discovery via listTools()');
  console.log('  ✅ Dynamic GraphQL endpoint configuration');
  console.log('  ✅ Complete schema introspection (resolver discovery)');
  console.log('  ✅ GraphQL query execution with variables');
  console.log('  ✅ Security constraint enforcement');
  console.log('  ✅ Proper error handling and cleanup');
  console.log('\n🚀 This is exactly how LLMs discover and use GraphQL APIs!');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMCPClientExample()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Example failed:', error);
      process.exit(1);
    });
}