/**
 * Test para verificar si la extracción de datos semánticos funciona
 */

import { detectGlobalState } from './src/layer-a-static/analyses/tier3/shared-state/parsers/state-parser.js';
import { detectEventPatterns } from './src/layer-a-static/analyses/tier3/event-detector/detector.js';

// Código de prueba con shared state y eventos
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
`;

async function test() {
  console.log('🧪 Testing detectGlobalState...');
  const globalState = await detectGlobalState(testCode, 'test.js');
  console.log('Shared state found:', globalState.globalAccess.length);
  console.log(JSON.stringify(globalState, null, 2));

  console.log('\n🧪 Testing detectEventPatterns...');
  const events = await detectEventPatterns(testCode, 'test.js');
  console.log('Event listeners:', events.eventListeners.length);
  console.log('Event emitters:', events.eventEmitters.length);
  console.log(JSON.stringify(events, null, 2));
}

test().catch(console.error);
