/**
 * Prueba de humo rápida del parser-v2
 * node scripts/smoke-test-parser-v2.mjs
 */
import { parseFile } from '../src/layer-a-static/parser-v2/index.js';
import { readFileSync } from 'fs';

const testFile = 'src/layer-a-static/parser-v2/extractor.js';
const code = readFileSync(testFile, 'utf-8');

console.log('🔥 Smoke test parser-v2...');
const result = await parseFile(testFile, code);

console.log(`✅ Functions: ${result.functions.length}`);
console.log(`✅ Imports:   ${result.imports.length}`);
console.log(`✅ Exports:   ${result.exports.length}`);
console.log(`✅ Calls:     ${result.calls.length}`);

if (result.functions.length > 0) {
    const fn = result.functions[0];
    console.log(`\n📝 First function: "${fn.name}" (line ${fn.line}–${fn.endLine})`);
    console.log(`   calls inside: ${fn.calls.length} → ${fn.calls.slice(0, 3).map(c => c.name).join(', ')}`);
}

if (result._error) {
    console.error('❌ Error:', result._error);
    process.exit(1);
}

console.log('\n✅ parser-v2 smoke test passed!');
