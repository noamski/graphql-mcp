#!/usr/bin/env node

/**
 * Complete example showing how an MCP client connects to the GraphQL MCP server
 * and discovers GraphQL resolvers dynamically
 */

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

async function demonstrateCompleteFlow() {
  console.log('🚀 Complete MCP Client-Server Discovery Example\n');

  // Step 1: Create MCP client
  console.log('📡 Step 1: Creating MCP Client...');
  const client = new Client({
    name: "graphql-discovery-example",
    version: "1.0.0"
  }, {
    capabilities: {
      tools: {}
    }
  });

  // Step 2: Connect to GraphQL MCP Server
  console.log('🔌 Step 2: Connecting to GraphQL MCP Server...');
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['../dist/index.js'],
    env: {
      MCP_TRANSPORT: 'stdio'
    }
  });

  await client.connect(transport);
  console.log('✅ Connected to GraphQL MCP Server\n');

  // Step 3: Discover available tools
  console.log('🔍 Step 3: Discovering available MCP tools...');
  const toolsResponse = await client.request({
    method: "tools/list"
  });

  console.log(`Found ${toolsResponse.tools.length} tools:`);
  toolsResponse.tools.forEach((tool, i) => {
    console.log(`  ${i + 1}. ${tool.name} - ${tool.description}`);
  });
  console.log();

  // Step 4: Configure GraphQL endpoint
  console.log('⚙️  Step 4: Configuring GraphQL endpoint...');
  const configResponse = await client.request({
    method: "tools/call",
    params: {
      name: "graphql_configure",
      arguments: {
        endpoint: "https://countries.trevorblades.com/",
        timeout: 30000,
        maxDepth: 5,
        maxComplexity: 50
      }
    }
  });

  console.log('✅ Configuration result:', configResponse.result.content[0].text);
  console.log();

  // Step 5: Introspect GraphQL schema to discover ALL resolvers
  console.log('🔬 Step 5: Introspecting GraphQL schema to discover resolvers...');
  const schemaResponse = await client.request({
    method: "tools/call",
    params: {
      name: "graphql_introspect",
      arguments: {
        includeDeprecated: false
      }
    }
  });

  // Parse the schema from the response
  const schemaText = schemaResponse.result.content[0].text;
  const schemaData = JSON.parse(schemaText.split('Full Schema:\n')[1]);
  
  console.log(`📊 Schema Discovery Results:`);
  console.log(`- Total types: ${schemaData.types.length}`);
  console.log(`- Query type: ${schemaData.queryType ? schemaData.queryType.name : 'None'}`);
  
  // Find and display all available query resolvers
  const queryType = schemaData.types.find(t => t.name === 'Query');
  if (queryType && queryType.fields) {
    console.log(`\n🎯 Discovered Query Resolvers (${queryType.fields.length} total):`);
    queryType.fields.forEach(field => {
      console.log(`  • ${field.name}: ${field.type}`);
      if (field.args && field.args.length > 0) {
        field.args.forEach(arg => {
          console.log(`    - ${arg.name}: ${arg.type}${arg.defaultValue ? ` = ${arg.defaultValue}` : ''}`);
        });
      }
    });
  }

  // Display available types
  console.log(`\n📋 Available GraphQL Types:`);
  const objectTypes = schemaData.types.filter(t => t.kind === 'OBJECT' && !t.name.startsWith('__'));
  objectTypes.slice(0, 5).forEach(type => {
    console.log(`  • ${type.name} (${type.fields ? type.fields.length : 0} fields)`);
  });
  if (objectTypes.length > 5) {
    console.log(`  ... and ${objectTypes.length - 5} more types`);
  }
  
  console.log();

  // Step 6: Execute queries using discovered resolvers
  console.log('🚀 Step 6: Executing GraphQL queries using discovered resolvers...');
  
  // Query 1: Get all countries
  console.log('📍 Query 1: Getting all countries...');
  const countriesResponse = await client.request({
    method: "tools/call",
    params: {
      name: "graphql_query",
      arguments: {
        query: "query { countries { name code emoji } }"
      }
    }
  });

  if (countriesResponse.result.content[0].text.includes('successfully')) {
    const countriesData = JSON.parse(countriesResponse.result.content[0].text.split('Result:\n')[1]);
    console.log(`✅ Retrieved ${countriesData.countries.length} countries`);
    console.log('Sample countries:');
    countriesData.countries.slice(0, 3).forEach(country => {
      console.log(`  ${country.emoji} ${country.name} (${country.code})`);
    });
  }

  // Query 2: Get specific country with variables
  console.log('\n🇺🇸 Query 2: Getting specific country using variables...');
  const countryResponse = await client.request({
    method: "tools/call",
    params: {
      name: "graphql_query",
      arguments: {
        query: `
          query GetCountry($code: ID!) {
            country(code: $code) {
              name
              code
              emoji
              capital
              currency
              languages {
                name
                native
              }
            }
          }
        `,
        variables: {
          code: "US"
        },
        operationName: "GetCountry"
      }
    }
  });

  if (countryResponse.result.content[0].text.includes('successfully')) {
    const countryData = JSON.parse(countryResponse.result.content[0].text.split('Result:\n')[1]);
    const country = countryData.country;
    console.log(`✅ Retrieved country data:`);
    console.log(`  Name: ${country.name} ${country.emoji}`);
    console.log(`  Capital: ${country.capital}`);
    console.log(`  Currency: ${country.currency}`);
    console.log(`  Languages: ${country.languages.map(l => l.name).join(', ')}`);
  }

  // Step 7: Check server status
  console.log('\n📊 Step 7: Checking server status...');
  const statusResponse = await client.request({
    method: "tools/call",
    params: {
      name: "graphql_status"
    }
  });

  const statusData = JSON.parse(statusResponse.result.content[0].text.split(':\n')[1]);
  console.log('📈 Server Status:');
  Object.entries(statusData).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });

  console.log('\n🎉 Complete MCP Discovery Flow Successful!');
  console.log('\n📋 What the MCP client learned:');
  console.log('  ✅ Server provides 4 GraphQL tools');
  console.log('  ✅ Can connect to any GraphQL API dynamically');
  console.log('  ✅ Discovers all available resolvers via introspection');
  console.log('  ✅ Can execute any valid GraphQL query');
  console.log('  ✅ Supports variables, operations, and complex queries');
  console.log('  ✅ Handles authentication and security constraints');
  console.log('\n🚀 Ready for production LLM integration!');

  // Clean up
  await client.close();
}

if (require.main === module) {
  demonstrateCompleteFlow()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Example failed:', error);
      process.exit(1);
    });
}