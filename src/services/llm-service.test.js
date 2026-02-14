/**
 * Tests para LLMService
 * 
 * Run: node src/services/llm-service.test.js
 */

import { LLMService, analyzeWithLLM, isLLMAvailable, waitForLLM } from './llm-service.js';

// Test utilities
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ ${message}`);
}

async function test(name, fn) {
  console.log(`\n🧪 ${name}`);
  try {
    await fn();
    console.log(`  ✅ Test passed: ${name}`);
  } catch (error) {
    console.error(`  ❌ Test failed: ${name}`);
    console.error(`     ${error.message}`);
    process.exitCode = 1;
  }
}

// Tests
async function runTests() {
  console.log('=================================');
  console.log('LLMService Tests');
  console.log('=================================');

  await test('Singleton pattern', async () => {
    // Reset any existing instance
    LLMService.resetInstance();
    
    const instance1 = await LLMService.getInstance();
    const instance2 = await LLMService.getInstance();
    
    assert(instance1 === instance2, 'Same instance returned');
    assert(instance1 instanceof LLMService, 'Instance is LLMService');
  });

  await test('Initial state', async () => {
    LLMService.resetInstance();
    
    const service = await LLMService.getInstance();
    
    assert(service.isAvailable() === false || service.isAvailable() === true, 'Availability is boolean');
    assert(service.initialized === true, 'Service is initialized');
  });

  await test('Circuit breaker initial state', async () => {
    LLMService.resetInstance();
    
    const service = await LLMService.getInstance();
    const cbState = service.getCircuitBreakerState();
    
    assert(cbState.state === 'CLOSED', 'Circuit breaker starts CLOSED');
    assert(cbState.failureCount === 0, 'No failures initially');
    assert(cbState.threshold === 5, 'Default threshold is 5');
  });

  await test('Metrics structure', async () => {
    LLMService.resetInstance();
    
    const service = await LLMService.getInstance();
    const metrics = service.getMetrics();
    
    assert(typeof metrics.requestsTotal === 'number', 'requestsTotal is number');
    assert(typeof metrics.requestsSuccessful === 'number', 'requestsSuccessful is number');
    assert(typeof metrics.requestsFailed === 'number', 'requestsFailed is number');
    assert(typeof metrics.latencyMsAvg === 'number', 'latencyMsAvg is number');
    assert(typeof metrics.availability === 'boolean', 'availability is boolean');
  });

  await test('Event handlers', async () => {
    LLMService.resetInstance();
    
    const service = await LLMService.getInstance();
    let eventFired = false;
    
    const handler = () => { eventFired = true; };
    service.on('available', handler);
    
    // Check that handler is registered
    assert(service._eventHandlers.available.length === 1, 'Handler registered');
    
    service.off('available', handler);
    assert(service._eventHandlers.available.length === 0, 'Handler unregistered');
  });

  await test('Convenience functions', async () => {
    LLMService.resetInstance();
    
    // These should not throw
    const available = await isLLMAvailable();
    assert(typeof available === 'boolean', 'isLLMAvailable returns boolean');
    
    // waitForLLM with short timeout
    const ready = await waitForLLM(100);
    assert(typeof ready === 'boolean', 'waitForLLM returns boolean');
  });

  await test('Dispose and reset', async () => {
    LLMService.resetInstance();
    
    const service = await LLMService.getInstance();
    await service.dispose();
    
    assert(service.initialized === false, 'Service not initialized after dispose');
  });

  console.log('\n=================================');
  console.log('All tests completed!');
  console.log('=================================\n');
  
  // Cleanup
  LLMService.resetInstance();
}

// Run tests
runTests().catch(console.error);
