/**
 * Test directo para extractTreeSitterMetadata
 */

import { extractTreeSitterMetadata } from './src/layer-a-static/extractors/metadata/tree-sitter-integration.js';

// Código de prueba
const testCode = `
const EventEmitter = require('events');
const emitter = new EventEmitter();

// Shared state
window.myGlobal = { count: 0 };
global.apiKey = 'secret';

// Event listener
window.addEventListener('load', () => {
  console.log('loaded');
});

emitter.on('data', (data) => {
  console.log(data);
});

// Event emitter
function processData() {
  emitter.emit('data', { value: 1 });
  window.dispatchEvent(new Event('custom'));
}

// Function with shared state
function increment() {
  window.myGlobal.count++;
  return global.apiKey;
}

module.exports = { processData, increment };
`;

async function test() {
  console.log('🧪 Testing extractTreeSitterMetadata para "processData"...');
  
  // Simular functionInfo para processData (líneas 19-23)
  const functionInfo = {
    name: 'processData',
    line: 19,
    endLine: 23
  };
  
  const result = await extractTreeSitterMetadata(
    testCode.split('\n').slice(18, 23).join('\n'), // Código de la función
    functionInfo,
    'test-app.js',
    testCode // Código completo del archivo
  );

  console.log('\n📊 Result:');
  console.log('  sharedStateAccess:', result.sharedStateAccess?.length || 0);
  console.log('  eventEmitters:', result.eventEmitters?.length || 0);
  console.log('  eventListeners:', result.eventListeners?.length || 0);

  if (result.sharedStateAccess && result.sharedStateAccess.length > 0) {
    console.log('\n  Shared state details:');
    result.sharedStateAccess.forEach(access => {
      console.log(`    - ${access.fullReference} (${access.type}) en línea ${access.line}`);
    });
  }

  if (result.eventEmitters && result.eventEmitters.length > 0) {
    console.log('\n  Event emitters details:');
    result.eventEmitters.forEach(emitter => {
      console.log(`    - emit '${emitter.eventName}' en línea ${emitter.line}`);
    });
  }

  if (result.eventListeners && result.eventListeners.length > 0) {
    console.log('\n  Event listeners details:');
    result.eventListeners.forEach(listener => {
      console.log(`    - on '${listener.eventName}' en línea ${listener.line}`);
    });
  }
}

test().catch(console.error);
