import { detectGodObject } from './src/layer-b-semantic/metadata-contract/detectors/architectural-patterns.js';

// Test con diferentes valores
const tests = [
  { exports: 3, dependents: 10, desc: 'Core.js (3 exports, 10 deps)' },
  { exports: 5, dependents: 5, desc: 'Caso clasico (5 exports, 5 deps)' },
  { exports: 2, dependents: 8, desc: 'Ratio extremo (2 exports, 8 deps)' },
  { exports: 1, dependents: 3, desc: 'Pequeno (1 export, 3 deps)' },
];

console.log('Test de deteccion God Object:');
console.log('');

for (const test of tests) {
  const result = detectGodObject(test.exports, test.dependents);
  const status = result ? 'GOD OBJECT' : 'No es God Object';
  console.log(`${test.desc}:`);
  console.log(`  ${test.exports} exports, ${test.dependents} dependents -> ${status}`);
  console.log('');
}
