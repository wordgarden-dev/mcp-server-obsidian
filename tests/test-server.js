#!/usr/bin/env node
/**
 * Simple MCP protocol test
 * Tests that the server responds correctly to ListTools request
 */

import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = join(__dirname, '..', 'dist', 'index.js');

console.log('Testing MCP Server...\n');

// Start server
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let stdoutData = '';
let stderrData = '';

server.stdout.on('data', (data) => {
  stdoutData += data.toString();
  console.log('STDOUT:', data.toString());
});

server.stderr.on('data', (data) => {
  stderrData += data.toString();
  console.log('STDERR:', data.toString());
});

server.on('close', (code) => {
  console.log(`\nServer exited with code ${code}`);
  
  if (stderrData.includes('Obsidian MCP Server running')) {
    console.log('✓ Server started successfully');
  } else {
    console.log('✗ Server startup message not found');
  }
  
  if (stderrData.includes('kanban_read, kanban_list, kanban_create, kanban_delete')) {
    console.log('✓ Tools registered correctly');
  } else {
    console.log('✗ Tools not found in output');
  }
});

// Send ListTools request
const listToolsRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {}
};

setTimeout(() => {
  console.log('\nSending ListTools request...');
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
}, 1000);

// Wait for response, then shutdown
setTimeout(() => {
  console.log('\nShutting down server...');
  server.kill('SIGTERM');
}, 3000);
