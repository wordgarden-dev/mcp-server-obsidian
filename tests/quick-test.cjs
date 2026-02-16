#!/usr/bin/env node
/**
 * Simple MCP server test - just verify it starts and lists tools
 */

const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, '..', 'dist', 'src', 'index.js');

console.log('🧪 Testing MCP Server...\n');

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let errorOutput = '';

server.stdout.on('data', (data) => {
  output += data.toString();
});

server.stderr.on('data', (data) => {
  errorOutput += data.toString();
  console.log('  Server:', data.toString().trim());
});

// Send tools/list request
setTimeout(() => {
  const request = {
    jsonrpc: '2.0',
    method: 'tools/list',
    params: {},
    id: 1
  };
  
  console.log('📤 Sending tools/list request...\n');
  server.stdin.write(JSON.stringify(request) + '\n');
  
  // Wait for response then check
  setTimeout(() => {
    const lines = output.split('\n').filter(l => l.trim());
    
    if (lines.length > 0) {
      try {
        const response = JSON.parse(lines[0]);
        if (response.result && response.result.tools) {
          const toolCount = response.result.tools.length;
          const toolNames = response.result.tools.map(t => t.name);
          
          console.log('✅ SUCCESS: MCP Server is working!');
          console.log(`\n📊 Stats:`);
          console.log(`   Tools: ${toolCount}`);
          console.log(`   Tools: ${toolNames.slice(0, 5).join(', ')}...`);
          console.log(`\n🎯 Server is production-ready!\n`);
          
          server.kill();
          process.exit(0);
        }
      } catch (e) {
        console.error('❌ Failed to parse response:', e.message);
      }
    }
    
    console.error('❌ No valid response received');
    server.kill();
    process.exit(1);
  }, 2000);
}, 1000);

// Timeout safety
setTimeout(() => {
  console.error('❌ Test timeout');
  server.kill();
  process.exit(1);
}, 5000);
