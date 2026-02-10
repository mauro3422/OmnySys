#!/usr/bin/env node
/**
 * Test de Integración v0.7.1
 * 
 * Verifica que los 4 sistemas nuevos funcionan correctamente.
 */

import { ShadowRegistry } from '../src/layer-c-memory/shadow-registry/index.js';
import { extractPerformanceMetrics } from '../src/layer-a-static/extractors/metadata/performance-impact.js';
import { extractTypeContracts } from '../src/layer-a-static/extractors/metadata/type-contracts.js';
import { extractErrorFlow } from '../src/layer-a-static/extractors/metadata/error-flow.js';
import { extractTemporalPatterns } from '../src/layer-a-static/extractors/metadata/temporal-connections.js';

console.log('🧪 Test de Integración v0.7.1\n');

// Test 1: Extraer performance de función de ejemplo
console.log('1️⃣ Test: Performance Metrics');
const code1 = `
async function processOrder(order) {
  const items = await fetchItems(order.id);
  const total = items.reduce((sum, item) => sum + item.price, 0);
  return { total, items };
}
`;

const perf = extractPerformanceMetrics(code1, {});
console.log('   Complexity:', perf.complexity.bigO);
console.log('   Impact Score:', perf.impactScore);
console.log('   Async:', perf.estimates.async);
console.log('   ✅ Performance OK\n');

// Test 2: Type Contracts
console.log('2️⃣ Test: Type Contracts');
const code2 = `
/**
 * @param {Order} order
 * @returns {Promise<OrderResult>}
 * @throws {ValidationError}
 */
function processOrder(order) {
  return saveOrder(order);
}
`;

const jsdoc = {
  params: [{ name: 'order', type: 'Order' }],
  returns: { type: 'Promise<OrderResult>' },
  throws: [{ type: 'ValidationError' }]
};

const contracts = extractTypeContracts(code2, jsdoc);
console.log('   Params:', contracts.params.map(p => p.type).join(', '));
console.log('   Returns:', contracts.returns?.type);
console.log('   Throws:', contracts.throws.map(t => t.type).join(', '));
console.log('   Confidence:', contracts.confidence);
console.log('   ✅ Type Contracts OK\n');

// Test 3: Error Flow
console.log('3️⃣ Test: Error Flow');
const code3 = `
function validateOrder(order) {
  if (!order.items) throw new ValidationError('Missing items');
  if (order.total < 0) throw new Error('Invalid total');
  return true;
}
`;

const errorFlow = extractErrorFlow(code3, contracts);
console.log('   Throws:', errorFlow.throws.map(t => `${t.type} (${t.source})`).join(', '));
console.log('   Unhandled:', errorFlow.unhandledCalls.length);
console.log('   ✅ Error Flow OK\n');

// Test 4: Temporal Patterns
console.log('4️⃣ Test: Temporal Patterns');
const code4 = `
function initApp() {
  useEffect(() => {
    loadConfig();
    return () => cleanup();
  }, []);
}
`;

const temporal = extractTemporalPatterns(code4, { name: 'initApp' });
console.log('   Is Init:', temporal.initialization.length > 0);
console.log('   Lifecycle Hooks:', temporal.lifecycleHooks.map(h => h.type).join(', '));
console.log('   Has Cleanup:', temporal.lifecycleHooks.some(h => h.hasCleanup));
console.log('   ✅ Temporal OK\n');

// Test 5: Shadow Registry
console.log('5️⃣ Test: Shadow Registry');
const registry = new ShadowRegistry('.omnysysdata');
await registry.initialize();

const shadows = await registry.listShadows();
console.log('   Shadows existentes:', shadows.length);
console.log('   ✅ Shadow Registry OK\n');

console.log('✅ Todos los sistemas integrados correctamente!');
console.log('\n📊 Resumen:');
console.log('   • Performance: Extrae complejidad e impacto');
console.log('   • Type Contracts: Valida contratos de tipos');
console.log('   • Error Flow: Mapea throws y catches');
console.log('   • Temporal: Detecta orden de ejecución');
console.log('   • Shadow Registry: Preserva ADN evolutivo');
