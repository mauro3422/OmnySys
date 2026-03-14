/**
 * Test script para helper-reuse-detector
 */

import { findExistingHelpers, buildReuseSuggestion } from './src/shared/compiler/helper-reuse-detector.js';
import { getRepository } from './src/layer-c-memory/storage/repository/repository-factory.js';

const projectPath = 'C:\\Dev\\OmnySystem';

console.log('\n=== PROBANDO Helper Reuse Detection ===\n');

const repo = getRepository(projectPath);

// Test 1: Buscar helpers similares a isValidEmail
console.log('Test 1: Buscar helpers similares a isValidEmail');
const helpers1 = await findExistingHelpers(
  projectPath,
  'validation:logic:core:unknown',
  'isValidEmail'
);
console.log(`Encontrados: ${helpers1.length} helpers`);
if (helpers1.length > 0) {
  console.log('Mejor match:', helpers1[0]);
  const suggestion1 = buildReuseSuggestion('src/test.js', helpers1);
  console.log('Sugerencia:', JSON.stringify(suggestion1, null, 2));
}
console.log('');

// Test 2: Buscar helpers similares a normalizeString
console.log('Test 2: Buscar helpers similares a normalizeString');
const helpers2 = await findExistingHelpers(
  projectPath,
  'transform:logic:core:unknown',
  'normalizeString'
);
console.log(`Encontrados: ${helpers2.length} helpers`);
if (helpers2.length > 0) {
  console.log('Mejor match:', helpers2[0]);
}
console.log('');

// Test 3: Buscar helpers similares a formatDate
console.log('Test 3: Buscar helpers similares a formatDate');
const helpers3 = await findExistingHelpers(
  projectPath,
  'transform:logic:core:unknown',
  'formatDate'
);
console.log(`Encontrados: ${helpers3.length} helpers`);
if (helpers3.length > 0) {
  console.log('Mejor match:', helpers3[0]);
}
console.log('');

console.log('=== RESUMEN ===');
console.log(`Tests con matches: ${[helpers1, helpers2, helpers3].filter(h => h.length > 0).length}/3`);
