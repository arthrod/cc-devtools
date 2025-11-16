#!/usr/bin/env node
/**
 * Test source-code-mapper MCP server from stablesight-core project
 * This mimics exactly how Claude Code would call it
 */

import { spawn } from 'child_process';
import { join } from 'path';
import { homedir } from 'os';

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

const ccDevtoolsRoot = process.cwd();
const stablesightRoot = join(homedir(), 'Projects', 'stablesight-core');
const serverPath = join(ccDevtoolsRoot, 'dist', 'source-code-mapper', 'index.js');

console.log('Testing source-code-mapper from stablesight-core...');
console.log(`Server path: ${serverPath}`);
console.log(`Working directory: ${stablesightRoot}\n`);

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: stablesightRoot,
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
  console.log(`\nServer exited with code ${code}`);
  process.exit(code ?? 0);
});

function sendRequest(method: string, params?: Record<string, unknown>, timeoutMs = 10000): Promise<MCPResponse> {
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

    console.log('1. Testing initialize (10s timeout)...');
    const startInit = Date.now();
    const initResponse = await sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' }
    }, 10000);
    const initTime = Date.now() - startInit;
    console.log(`✓ Initialize responded in ${initTime}ms`);

    console.log('\n2. Sending initialized notification...');
    server.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    }) + '\n');

    console.log('\n3. Testing search_code immediately (should not hang)...');
    const startSearch = Date.now();
    const searchResponse = await sendRequest('tools/call', {
      name: 'search_code',
      arguments: { query: 'config', mode: 'exact', limit: 3 }
    }, 15000);
    const searchTime = Date.now() - startSearch;

    const result = searchResponse.result as { content: Array<{ text: string }> };
    const parsed = JSON.parse(result.content[0].text);

    console.log(`✓ Search responded in ${searchTime}ms`);
    console.log(`  Response: ${parsed.success ? 'SUCCESS' : 'ERROR'}`);
    if (parsed.error) {
      console.log(`  Message: ${parsed.error}`);
    } else if (parsed.data) {
      console.log(`  Found ${parsed.data.length} results`);
    }

    console.log('\n4. Testing query_imports (should not hang)...');
    const startImports = Date.now();
    const importsResponse = await sendRequest('tools/call', {
      name: 'query_imports',
      arguments: { filepath: '/nonexistent' }
    }, 10000);
    const importsTime = Date.now() - startImports;
    console.log(`✓ Query imports responded in ${importsTime}ms`);

    console.log('\n✓ ALL TESTS PASSED!');
    console.log('\nSummary:');
    console.log(`  - Initialize: ${initTime}ms`);
    console.log(`  - Search: ${searchTime}ms`);
    console.log(`  - Imports: ${importsTime}ms`);
    console.log('\nNo hanging detected! The fix works.');

    server.kill();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ TEST FAILED:', error);
    server.kill();
    process.exit(1);
  }
}

setTimeout(() => {
  console.error('\n✗ Overall timeout - test took too long');
  server.kill();
  process.exit(1);
}, 60000);

runTests().catch((error) => {
  console.error('Test execution error:', error);
  server.kill();
  process.exit(1);
});
