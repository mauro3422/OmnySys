/**
 * Test para verificar si treeSitter se está llamando y qué devuelve
 */

import { extractTreeSitterMetadata } from './src/layer-a-static/extractors/metadata/tree-sitter-integration.js';

// Código de prueba simple
const testCode = `
window.myGlobal = { count: 0 };

function increment() {
  window.myGlobal.count++;
  return window.myGlobal.count;
}

module.exports = { increment };
`;

async function test() {
  console.log('🧪 Testing extractTreeSitterMetadata...');
  
  const functionInfo = {
    name: 'increment',
    line: 4,
    endLine: 7
  };
  
  try {
    const result = await extractTreeSitterMetadata(
      testCode.split('\n').slice(3, 7).join('\n'),
      functionInfo,
      'test-app.js',
      testCode
    );

    console.log('\n✅ Result:');
    console.log('  sharedStateAccess:', result.sharedStateAccess?.length || 0);
    console.log('  eventEmitters:', result.eventEmitters?.length || 0);
    console.log('  eventListeners:', result.eventListeners?.length || 0);
    console.log('  scopeType:', result.scopeType);

    if (result.sharedStateAccess && result.sharedStateAccess.length > 0) {
      console.log('\n  Shared state details:');
      result.sharedStateAccess.forEach(access => {
        console.log(`    - ${access.fullReference} (${access.type}) en línea ${access.line}`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test().catch(console.error);
