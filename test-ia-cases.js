#!/usr/bin/env node
/**
 * Script para testear casos que activan IA
 * 
 * Uso: node test-ia-cases.js [scenario-name]
 * Ejemplo: node test-ia-cases.js scenario-ia-dynamic-imports
 */

import { indexProject } from './src/layer-a-static/indexer.js';
import path from 'path';

const TEST_CASES = [
  'scenario-ia-dynamic-imports',
  'scenario-ia-orphan-effects', 
  'scenario-ia-ambiguous-events'
];

async function runTest(scenarioName) {
  const projectPath = path.join(process.cwd(), 'test-cases', scenarioName);
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 Testing: ${scenarioName}`);
  console.log(`${'='.repeat(60)}\n`);
  
  try {
    const result = await indexProject(projectPath, {
      verbose: true,
      skipLLM: false,  // ← Esto activa la IA
      outputPath: 'system-map.json'
    });
    
    console.log(`\n✅ Test completed: ${scenarioName}`);
    console.log(`   Files analyzed: ${Object.keys(result.files || {}).length}`);
    
    // Verificar si se activó la IA
    const hasLLMEnhancement = Object.values(result.files || {}).some(
      f => f.aiEnhancement || f.llmInsights
    );
    
    if (hasLLMEnhancement) {
      console.log('   🤖 IA was ACTIVATED');
    } else {
      console.log('   ⚠️  IA was NOT activated (static analysis sufficient)');
    }
    
    return result;
  } catch (error) {
    console.error(`\n❌ Test failed: ${scenarioName}`);
    console.error(error.message);
    throw error;
  }
}

async function main() {
  const targetScenario = process.argv[2];
  
  if (targetScenario) {
    // Test específico
    if (!TEST_CASES.includes(targetScenario)) {
      console.error(`❌ Unknown scenario: ${targetScenario}`);
      console.log(`Available: ${TEST_CASES.join(', ')}`);
      process.exit(1);
    }
    await runTest(targetScenario);
  } else {
    // Test todos
    console.log('\n🚀 Running all IA test cases...\n');
    for (const scenario of TEST_CASES) {
      await runTest(scenario);
    }
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed!');
    console.log('='.repeat(60) + '\n');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
