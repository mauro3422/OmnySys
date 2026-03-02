/**
 * Test para verificar que la extracción de átomos ahora incluye datos semánticos
 */

import { extractAtomMetadata } from './src/layer-a-static/pipeline/phases/atom-extraction/extraction/atom-extractor.js';
import { parseFile } from './src/layer-a-static/parser/index.js';
import fs from 'fs';

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
  console.log('🧪 Parsing file...');
  const fileInfo = await parseFile('test-app.js', testCode);
  console.log('Functions found:', fileInfo.functions?.length || 0);

  if (fileInfo.functions && fileInfo.functions.length > 0) {
    console.log('\n🧪 Extracting atom metadata for first function...');
    const func = fileInfo.functions[0];
    console.log('Function:', func.name);
    
    const atomMetadata = await extractAtomMetadata(
      func,
      testCode.split('\n').slice(func.line - 1, func.endLine).join('\n'),
      {},
      'test-app.js',
      [],
      testCode
    );

    console.log('\n📊 Tree-sitter metadata:');
    console.log('  sharedStateAccess:', atomMetadata.sharedStateAccess?.length || 0);
    console.log('  eventEmitters:', atomMetadata.eventEmitters?.length || 0);
    console.log('  eventListeners:', atomMetadata.eventListeners?.length || 0);
    console.log('  scopeType:', atomMetadata.scopeType);

    if (atomMetadata.sharedStateAccess && atomMetadata.sharedStateAccess.length > 0) {
      console.log('\n  Shared state details:');
      atomMetadata.sharedStateAccess.forEach(access => {
        console.log(`    - ${access.fullReference} (${access.type}) en línea ${access.line}`);
      });
    }

    if (atomMetadata.eventEmitters && atomMetadata.eventEmitters.length > 0) {
      console.log('\n  Event emitters details:');
      atomMetadata.eventEmitters.forEach(emitter => {
        console.log(`    - emit '${emitter.eventName}' en línea ${emitter.line}`);
      });
    }

    if (atomMetadata.eventListeners && atomMetadata.eventListeners.length > 0) {
      console.log('\n  Event listeners details:');
      atomMetadata.eventListeners.forEach(listener => {
        console.log(`    - on '${listener.eventName}' en línea ${listener.line}`);
      });
    }
  }
}

test().catch(console.error);
