/**
 * Smoke test - Verifica que el sistema inicia sin errores
 * Ejecutar: node test-smoke.js
 */

import { OmnySysMCPServer } from './src/layer-c-memory/mcp/core/server-class.js';

async function test() {
  console.log('🔍 Running smoke test...\n');
  
  try {
    const server = new OmnySysMCPServer(process.cwd());
    await server.initialize();
    console.log('✅ Server initialized successfully');
    
    await server.shutdown();
    console.log('✅ Server shutdown successfully');
    
    console.log('\n🎉 All smoke tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Smoke test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

test();
