/**
 * Test Runner para Prompt Engine
 * Tests manuales sin dependencias externas
 */

import promptEngine from './src/layer-b-semantic/prompt-engine/index.js';
import { 
  detectArchetypes, 
  selectArchetypeBySeverity,
  getTemplateForType,
  listAvailableArchetypes 
} from './src/layer-b-semantic/prompt-engine/PROMPT_REGISTRY.js';

// Contador de tests
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ❌ ${name}: ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'Assertion failed'}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

console.log('\n🧪 PROMPT ENGINE TEST SUITE\n');

// Test 1: Listar arquetipos
console.log('📋 Test: Listar arquetipos disponibles');
test('Debe listar 9 arquetipos', () => {
  const archetypes = listAvailableArchetypes();
  assertEquals(archetypes.length, 9, 'Debe haber 9 arquetipos registrados');
});

test('Debe incluir god-object con severity 10', () => {
  const archetypes = listAvailableArchetypes();
  const godObject = archetypes.find(a => a.type === 'god-object');
  assert(godObject, 'god-object debe existir');
  assertEquals(godObject.severity, 10, 'god-object debe tener severity 10');
});

// Test 2: Detección de arquetipos
console.log('\n🔍 Test: Detección de arquetipos');
test('Debe detectar god-object', () => {
  const metadata = { exportCount: 15, dependentCount: 25 };
  const detected = detectArchetypes(metadata);
  const hasGodObject = detected.some(d => d.type === 'god-object');
  assert(hasGodObject, 'Debe detectar god-object');
});

test('Debe detectar orphan-module', () => {
  const metadata = { exportCount: 1, dependentCount: 0 };
  const detected = detectArchetypes(metadata);
  const hasOrphan = detected.some(d => d.type === 'orphan-module');
  assert(hasOrphan, 'Debe detectar orphan-module');
});

test('Debe detectar state-manager', () => {
  const metadata = { hasGlobalAccess: true };
  const detected = detectArchetypes(metadata);
  const hasStateManager = detected.some(d => d.type === 'state-manager');
  assert(hasStateManager, 'Debe detectar state-manager');
});

test('Debe detectar event-hub', () => {
  const metadata = { eventNames: ['click', 'submit'] };
  const detected = detectArchetypes(metadata);
  const hasEventHub = detected.some(d => d.type === 'event-hub');
  assert(hasEventHub, 'Debe detectar event-hub');
});

test('Debe detectar dynamic-importer', () => {
  const metadata = { hasDynamicImports: true };
  const detected = detectArchetypes(metadata);
  const hasDynamicImporter = detected.some(d => d.type === 'dynamic-importer');
  assert(hasDynamicImporter, 'Debe detectar dynamic-importer');
});

// Test 3: Selección por severidad
console.log('\n⚖️  Test: Selección por severidad');
test('Debe seleccionar god-object sobre state-manager', () => {
  const metadata = { exportCount: 15, dependentCount: 25, hasGlobalAccess: true };
  const detected = detectArchetypes(metadata);
  const selected = selectArchetypeBySeverity(detected);
  assertEquals(selected, 'god-object', 'god-object tiene mayor severidad');
});

test('Debe seleccionar default si no hay coincidencias', () => {
  const metadata = { exportCount: 2, dependentCount: 3 };
  const detected = detectArchetypes(metadata);
  const selected = selectArchetypeBySeverity(detected);
  assertEquals(selected, 'default', 'Debe seleccionar default como fallback');
});

// Test 4: Templates
console.log('\n📝 Test: Obtención de templates');
test('Debe obtener template para god-object', () => {
  const template = getTemplateForType('god-object');
  assert(template, 'Template debe existir');
  assert(template.systemPrompt, 'Template debe tener systemPrompt');
  assert(template.userPrompt, 'Template debe tener userPrompt');
});

test('Debe obtener template para orphan-module', () => {
  const template = getTemplateForType('orphan-module');
  assert(template, 'Template debe existir');
  assert(template.systemPrompt, 'Template debe tener systemPrompt');
  assert(template.userPrompt, 'Template debe tener userPrompt');
});

test('Debe retornar default para tipo desconocido', () => {
  const template = getTemplateForType('tipo-inexistente');
  assert(template, 'Debe retornar template');
  assert(template.systemPrompt, 'Template debe tener systemPrompt');
});

// Test 5: Generación de prompts
console.log('\n🤖 Test: Generación de prompts (async)');

async function runAsyncTests() {
  await test('Debe generar prompt para state-manager', async () => {
    const metadata = {
      filePath: 'src/GameStore.js',
      exportCount: 3,
      dependentCount: 0,
      importCount: 0,
      functionCount: 3,
      exports: ['initGameState', 'resetGameState', 'getGameState'],
      hasGlobalAccess: true,
      hasLocalStorage: false,
      hasEventListeners: false,
      localStorageKeys: [],
      eventNames: []
    };
    const code = 'export function initGameState() { window.gameState = {}; }';
    
    const config = await promptEngine.generatePrompt(metadata, code);
    assert(config, 'Debe retornar configuración');
    assertEquals(config.analysisType, 'state-manager', 'Debe detectar state-manager');
    assert(config.systemPrompt, 'Debe tener systemPrompt');
    assert(config.userPrompt, 'Debe tener userPrompt');
  });

  await test('Debe generar prompt para god-object', async () => {
    const metadata = {
      filePath: 'src/App.js',
      exportCount: 15,
      dependentCount: 25,
      importCount: 0,
      functionCount: 10,
      exports: ['init', 'render'],
      hasGlobalAccess: true
    };
    const code = 'export function init() {}';
    
    const config = await promptEngine.generatePrompt(metadata, code);
    assert(config, 'Debe retornar configuración');
    assertEquals(config.analysisType, 'god-object', 'Debe detectar god-object');
  });

  await test('Debe generar prompt para orphan-module', async () => {
    const metadata = {
      filePath: 'src/utils.js',
      exportCount: 1,
      dependentCount: 0,
      importCount: 0,
      functionCount: 1,
      exports: ['formatDate']
    };
    const code = 'export function formatDate() {}';
    
    const config = await promptEngine.generatePrompt(metadata, code);
    assert(config, 'Debe retornar configuración');
    assertEquals(config.analysisType, 'orphan-module', 'Debe detectar orphan-module');
  });

  await test('Debe validar prompt generado', async () => {
    const metadata = { filePath: 'test.js', exportCount: 1, dependentCount: 0 };
    const code = 'export const a = 1;';
    
    const config = await promptEngine.generatePrompt(metadata, code);
    const isValid = promptEngine.validatePrompt(config);
    assert(isValid, 'El prompt debe ser válido');
  });

  // Reporte final
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total:  ${passed + failed}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log('='.repeat(50));

  process.exit(failed > 0 ? 1 : 0);
}

runAsyncTests().catch(err => {
  console.error('Error en tests:', err);
  process.exit(1);
});
