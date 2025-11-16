#!/usr/bin/env node
/**
 * Manual test for source-code-mapper MCP server
 * Tests that the server starts and responds to tool calls without hanging
 */

import { spawn } from 'child_process';
import { join } from 'path';

interface MCPRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface MCPResponse {
  jsonrpc: string;
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

const projectRoot = process.cwd();
const serverPath = join(projectRoot, 'dist', 'source-code-mapper', 'index.js');

console.log('Starting source-code-mapper MCP server test...\n');

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, NODE_ENV: 'test' }
});

let buffer = '';
let requestId = 1;
const pendingRequests = new Map<number, { resolve: (value: MCPResponse) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }>();

server.stdout.on('data', (data) => {
  buffer += data.toString();

  const lines = buffer.split('\n');
  buffer = lines.pop() ?? '';

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const response = JSON.parse(line) as MCPResponse;
      const pending = pendingRequests.get(response.id);

      if (pending) {
        clearTimeout(pending.timer);
        pendingRequests.delete(response.id);
        pending.resolve(response);
      }
    } catch (error) {
      console.error('Failed to parse response:', line);
      console.error('Error:', error);
    }
  }
});

server.stderr.on('data', (data) => {
  console.error('Server stderr:', data.toString());
});

server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code ?? 0);
});

function sendRequest(method: string, params?: Record<string, unknown>, timeoutMs = 5000): Promise<MCPResponse> {
  return new Promise((resolve, reject) => {
    const id = requestId++;
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    const timer = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error(`Request timeout after ${timeoutMs}ms: ${method}`));
    }, timeoutMs);

    pendingRequests.set(id, { resolve, reject, timer });

    server.stdin.write(JSON.stringify(request) + '\n');
  });
}

async function runTests(): Promise<void> {
  try {
    console.log('Waiting for server to start...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n1. Testing initialize (timeout: 10s)...');
    const initResponse = await sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' }
    }, 10000);
    console.log('✓ Initialize response received in time');
    console.log(JSON.stringify(initResponse, null, 2));

    console.log('\n2. Sending initialized notification...');
    server.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    }) + '\n');

    console.log('\n3. Testing tools/list...');
    const toolsResponse = await sendRequest('tools/list');
    console.log('✓ Tools response:', JSON.stringify(toolsResponse, null, 2));

    console.log('\n4. Testing search_code (should handle gracefully if indexing)...');
    const searchResponse = await sendRequest('tools/call', {
      name: 'search_code',
      arguments: { query: 'test', mode: 'exact', limit: 5 }
    }, 10000);
    console.log('✓ Search response:', JSON.stringify(searchResponse, null, 2));

    console.log('\n5. Testing query_imports...');
    const importResponse = await sendRequest('tools/call', {
      name: 'query_imports',
      arguments: { filepath: '/nonexistent' }
    });
    console.log('✓ Import response:', JSON.stringify(importResponse, null, 2));

    console.log('\n✓ All tests completed successfully!');
    console.log('\nServer did not hang and responded to all requests.');

    server.kill();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Test failed:', error);
    server.kill();
    process.exit(1);
  }
}

setTimeout(() => {
  console.error('\n✗ Overall timeout - server took too long');
  server.kill();
  process.exit(1);
}, 120000);

runTests().catch((error) => {
  console.error('Test execution error:', error);
  server.kill();
  process.exit(1);
});
