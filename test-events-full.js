/**
 * Test para verificar detectEventPatterns en todo el archivo
 */

import { detectEventPatterns } from './src/layer-a-static/analyses/tier3/event-detector/detector.js';

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
  console.log('🧪 Testing detectEventPatterns en todo el archivo...');
  
  const result = await detectEventPatterns(testCode, 'test-app.js');

  console.log('\n📊 Result:');
  console.log('  eventListeners:', result.eventListeners?.length || 0);
  console.log('  eventEmitters:', result.eventEmitters?.length || 0);

  if (result.eventListeners && result.eventListeners.length > 0) {
    console.log('\n  Event listeners details:');
    result.eventListeners.forEach(listener => {
      console.log(`    - ${listener.pattern} '${listener.eventName}' en línea ${listener.line} (func: ${listener.functionContext})`);
    });
  }

  if (result.eventEmitters && result.eventEmitters.length > 0) {
    console.log('\n  Event emitters details:');
    result.eventEmitters.forEach(emitter => {
      console.log(`    - ${emitter.pattern} '${emitter.eventName}' en línea ${emitter.line} (func: ${emitter.functionContext})`);
    });
  }
}

test().catch(console.error);
