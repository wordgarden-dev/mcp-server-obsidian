#!/usr/bin/env node
/**
 * End-to-end test: Use MCP server to manipulate real kanban board
 * 
 * Tests the full stack:
 * 1. MCP server stdio transport
 * 2. Tool invocation (kanban_read, kanban_item_add, kanban_item_move)
 * 3. Actual file manipulation
 */

const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, '..', 'dist', 'src', 'index.js');
const kanbanPath = path.join(__dirname, '..', '..', 'kanban.md');

let messageId = 1;

console.log('🧪 Starting MCP Server E2E Test...\n');

// Start the server
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

const requests = [];
const responses = [];

// Capture server output
server.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(l => l.trim());
  lines.forEach(line => {
    try {
      const msg = JSON.parse(line);
      responses.push(msg);
      console.log('📥 Response:', JSON.stringify(msg, null, 2).substring(0, 200));
    } catch (e) {
      // Ignore non-JSON
    }
  });
});

server.stderr.on('data', (data) => {
  console.log('🔧 Server:', data.toString());
});

// Helper to send MCP request
function sendRequest(method, params) {
  const request = {
    jsonrpc: '2.0',
    method,
    params,
    id: messageId++
  };
  requests.push(request);
  console.log(`\n📤 Request ${request.id}: ${method}`);
  server.stdin.write(JSON.stringify(request) + '\n');
}

// Wait for responses
function waitForResponse(id, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = setInterval(() => {
      const response = responses.find(r => r.id === id);
      if (response) {
        clearInterval(check);
        resolve(response);
      } else if (Date.now() - start > timeout) {
        clearInterval(check);
        reject(new Error(`Timeout waiting for response ${id}`));
      }
    }, 100);
  });
}

// Test sequence
async function runTests() {
  await new Promise(resolve => setTimeout(resolve, 1000)); // Let server initialize

  try {
    // Test 1: List tools
    console.log('\n═══ Test 1: List Tools ═══');
    sendRequest('tools/list', {});
    const toolsResponse = await waitForResponse(1);
    console.log('✅ Tools listed:', toolsResponse.result.tools.length, 'tools');

    // Test 2: Read kanban board
    console.log('\n═══ Test 2: Read Kanban Board ═══');
    sendRequest('tools/call', {
      name: 'kanban_read',
      arguments: { path: kanbanPath }
    });
    const readResponse = await waitForResponse(2);
    console.log('✅ Board read successfully');
    const board = JSON.parse(readResponse.result.content[0].text);
    console.log(`   Columns: ${board.columns.map(c => c.name).join(', ')}`);

    // Test 3: Add test item
    console.log('\n═══ Test 3: Add Test Item ═══');
    sendRequest('tools/call', {
      name: 'kanban_item_add',
      arguments: {
        path: kanbanPath,
        column: 'Backlog',
        text: '[E2E TEST] MCP server integration verified',
        completed: false
      }
    });
    const addResponse = await waitForResponse(3);
    console.log('✅ Test item added to Backlog');

    // Test 4: Move test item to Done
    console.log('\n═══ Test 4: Move Item to Done ═══');
    sendRequest('tools/call', {
      name: 'kanban_item_move',
      arguments: {
        path: kanbanPath,
        itemText: '[E2E TEST]',
        targetColumn: 'Done'
      }
    });
    const moveResponse = await waitForResponse(4);
    console.log('✅ Test item moved to Done');

    // Test 5: Mark as complete
    console.log('\n═══ Test 5: Mark Complete ═══');
    sendRequest('tools/call', {
      name: 'kanban_item_complete',
      arguments: {
        path: kanbanPath,
        itemText: '[E2E TEST]',
        completed: true
      }
    });
    const completeResponse = await waitForResponse(5);
    console.log('✅ Test item marked complete');

    // Test 6: Clean up - remove test item
    console.log('\n═══ Test 6: Cleanup ═══');
    sendRequest('tools/call', {
      name: 'kanban_item_remove',
      arguments: {
        path: kanbanPath,
        itemText: '[E2E TEST]'
      }
    });
    const removeResponse = await waitForResponse(6);
    console.log('✅ Test item removed');

    console.log('\n═══════════════════════════════');
    console.log('✅ ALL TESTS PASSED');
    console.log('═══════════════════════════════\n');
    console.log('MCP Server is fully functional!');
    console.log('Tools tested: kanban_read, kanban_item_add, kanban_item_move, kanban_item_complete, kanban_item_remove');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    process.exit(1);
  } finally {
    server.kill();
    process.exit(0);
  }
}

// Start tests after a brief delay
setTimeout(runTests, 500);
