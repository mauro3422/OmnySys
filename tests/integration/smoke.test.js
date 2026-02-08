/**
 * @fileoverview smoke.test.js
 * 
 * Integration smoke test - Verifies system loads without errors
 */

import { OmnySysMCPServer } from '#layer-c/mcp/core/server-class.js';

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}: ${error.message}`);
    process.exitCode = 1;
  }
}

console.log('\n🧪 Running integration smoke tests...\n');

// Test 1: Server class loads
test('OmnySysMCPServer class loads without errors', async () => {
  if (typeof OmnySysMCPServer !== 'function') {
    throw new Error('OmnySysMCPServer should be a class/function');
  }
});

// Test 2: Server can be instantiated
test('Server can be instantiated', async () => {
  const server = new OmnySysMCPServer(process.cwd());
  if (!server) {
    throw new Error('Failed to create server instance');
  }
});

// Test 3: Server has required methods
test('Server has required methods', async () => {
  const server = new OmnySysMCPServer(process.cwd());
  
  const requiredMethods = ['initialize', 'shutdown'];
  for (const method of requiredMethods) {
    if (typeof server[method] !== 'function') {
      throw new Error(`Server should have ${method} method`);
    }
  }
});

console.log('\n✨ Integration smoke tests completed!\n');

// Note: Full server initialization test requires a real project with analysis data
// This is just a smoke test to verify the code loads correctly
