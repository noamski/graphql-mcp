#!/usr/bin/env node

// Simple test to debug the MCP server issue
import { spawn } from 'child_process';

console.log('🧪 Testing GraphQL MCP Server...');

const child = spawn('/opt/homebrew/bin/graphql-mcp', [], {
  env: {
    ...process.env,
    GRAPHQL_ENDPOINT: 'https://countries.trevorblades.com/'
  },
  stdio: ['pipe', 'pipe', 'pipe']
});

// Track messages
let messageId = 0;

// Send initialize message
setTimeout(() => {
  const initMessage = {
    jsonrpc: '2.0',
    id: messageId++,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  };
  
  console.log('📤 Sending initialize message...');
  child.stdin.write(JSON.stringify(initMessage) + '\n');
}, 100);

// Send tools/list after initialization
setTimeout(() => {
  const listToolsMessage = {
    jsonrpc: '2.0',
    id: messageId++,
    method: 'tools/list',
    params: {}
  };
  
  console.log('📤 Sending tools/list message...');
  child.stdin.write(JSON.stringify(listToolsMessage) + '\n');
}, 500);

// Handle server output
child.stdout.on('data', (data) => {
  const messages = data.toString().trim().split('\n');
  messages.forEach(msg => {
    if (msg.trim()) {
      try {
        const parsed = JSON.parse(msg);
        console.log('📥 Server response:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('📥 Server output:', msg);
      }
    }
  });
});

child.stderr.on('data', (data) => {
  console.log('🔍 Server stderr:', data.toString());
});

child.on('close', (code) => {
  console.log(`🔚 Server exited with code ${code}`);
});

child.on('error', (error) => {
  console.log('❌ Server error:', error);
});

// Cleanup after 5 seconds
setTimeout(() => {
  console.log('🛑 Ending test...');
  child.kill();
  process.exit(0);
}, 5000);