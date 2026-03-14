/**
 * Test script para classifyUtilityHelperDuplicate
 */

import { classifyUtilityHelperDuplicate } from './src/shared/compiler/duplicate-signal-policy/detectors/core-policy.js';

console.log('\n=== PROBANDO classifyUtilityHelperDuplicate ===\n');

// Test 1: isValidEmail (debería detectar como validation helper)
const result1 = classifyUtilityHelperDuplicate(
  'src/__test-utils__/test-helpers.js',
  'isValidEmail',
  'validation:logic:core:unknown'
);
console.log('Test 1: isValidEmail');
console.log(JSON.stringify(result1, null, 2));
console.log('');

// Test 2: normalizeString (debería detectar como transform helper)
const result2 = classifyUtilityHelperDuplicate(
  'src/__test-utils__/test-helpers.js',
  'normalizeString',
  'transform:logic:core:unknown'
);
console.log('Test 2: normalizeString');
console.log(JSON.stringify(result2, null, 2));
console.log('');

// Test 3: formatDate (debería detectar como transform helper)
const result3 = classifyUtilityHelperDuplicate(
  'src/__test-utils__/test-helpers.js',
  'formatDate',
  'transform:logic:core:unknown'
);
console.log('Test 3: formatDate');
console.log(JSON.stringify(result3, null, 2));
console.log('');

// Test 4: safeJsonParse (debería detectar como utility helper)
const result4 = classifyUtilityHelperDuplicate(
  'src/__test-utils__/test-helpers.js',
  'safeJsonParse',
  'parse:logic:core:unknown'
);
console.log('Test 4: safeJsonParse');
console.log(JSON.stringify(result4, null, 2));
console.log('');

// Test 5: getNestedProperty (debería detectar como utility helper)
const result5 = classifyUtilityHelperDuplicate(
  'src/__test-utils__/test-helpers.js',
  'getNestedProperty',
  'access:logic:core:unknown'
);
console.log('Test 5: getNestedProperty');
console.log(JSON.stringify(result5, null, 2));
console.log('');

// Test 6: Función NO utility (debería retornar false)
const result6 = classifyUtilityHelperDuplicate(
  'src/core/business/payment-processor.js',
  'processPayment',
  'process:payment:domain:transaction'
);
console.log('Test 6: processPayment (NO utility)');
console.log(JSON.stringify(result6, null, 2));
console.log('');

console.log('=== RESUMEN ===');
console.log(`Tests que detectaron utility: ${[result1, result2, result3, result4, result5].filter(r => r.isUtilityHelper).length}/5`);
console.log(`Tests que NO detectaron utility: ${result6.isUtilityHelper ? 'ERROR' : 'OK'}`);
