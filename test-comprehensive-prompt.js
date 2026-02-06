#!/usr/bin/env node

/**
 * Prueba de Prompt Comprehensivo OPTIMIZADO para LFM2.5-Instruct
 * 
 * Basado en:
 * - docs/LFM2_OPTIMIZATION.md
 * - docs/LFM2_EXTRACT_PROMPTING_GUIDE.md
 */

import { LLMClient } from './src/ai/llm-client.js';
import fs from 'fs/promises';

// Prompt comprehensivo OPTIMIZADO para LFM2.5-Instruct
const comprehensivePrompt = {
  system: `<|im_start|>system
You are a specialized code analyzer for architectural pattern extraction.

<cognitive_vaccines>
- JSON output ONLY, NO markdown wrappers
- Use EXACT strings from code, NEVER invent names
- dependentCount=0 means IS ORPHAN, no exceptions
- Empty arrays [] when nothing found, NEVER omit fields
</cognitive_vaccines>

<schema>
Return ONLY this JSON structure (root object, NO wrappers):
{
  "confidence": 0.0-1.0,
  "primaryArchetype": "descriptive name",
  "characteristics": ["pattern1", "pattern2"],
  "analysis": {
    "orphan": {
      "isOrphan": true|false,
      "dependentCount": number,
      "suggestions": ["specific action 1", "specific action 2"]
    },
    "semantic": {
      "sharedState": [
        {
          "variable": "exactNameFromCode",
          "accessType": "read|write|both",
          "purpose": "specific description"
        }
      ],
      "events": {
        "emits": ["exactEventName1", "exactEventName2"],
        "listens": ["exactEventName1", "exactEventName2"]
      },
      "connections": [
        {
          "type": "shared-state|event|localStorage|none",
          "description": "specific connection"
        }
      ]
    },
    "patterns": {
      "isStateManager": true|false,
      "isSingleton": true|false,
      "isGodObject": true|false,
      "hasSideEffects": true|false
    }
  },
  "reasoning": "One sentence summary of findings"
}
</schema>

<evidence_first_protocol>
STEP 1 - Extract Evidence:
- Copy EXACT variable names from window.* assignments
- Copy EXACT event names from addEventListener/dispatchEvent
- Count EXACT dependentCount from metadata
- List EXACT export names

STEP 2 - Classify Patterns:
- Use extracted evidence ONLY
- NO assumptions without code proof
- Confidence based on evidence quantity
</evidence_first_protocol>

<validation_rules>
RULE 1 - STRUCTURE (CRITICAL):
MUST use NESTED structure: analysis.orphan.isOrphan
NEVER use flat structure: orphan: true/false
The field MUST be inside "analysis" object, NOT at root level.

RULE 2 - ORPHAN (MANDATORY):
IF metadata.dependentCount === 0 THEN analysis.orphan.isOrphan MUST BE true
IF metadata.dependentCount > 0 THEN analysis.orphan.isOrphan MUST BE false
NO EXCEPTIONS. NO CODE ANALYSIS OVERRIDE.

RULE 3 - SHARED STATE:
ONLY variables with window.* in code
Use exact variable name from code
Purpose describes ACTUAL usage in code

RULE 4 - EVENTS:
ONLY event names from string literals in code
Use exact event name between quotes
NO invented events

RULE 5 - PATTERNS:
isStateManager: true ONLY if window.* state management
isSingleton: true ONLY if single instance export
isGodObject: true ONLY if >5 unrelated responsibilities
hasSideEffects: true ONLY if modifies window/document

RULE 6 - CONFIDENCE:
0.9-1.0: 3+ patterns with solid evidence
0.7-0.89: 2 patterns with evidence
0.5-0.69: 1 pattern with evidence
0.0-0.49: No clear patterns
</validation_rules>

<output_rules>
1. Return VALID JSON ONLY
2. NO markdown code blocks (no \`\`\`json)
3. NO comments in JSON
4. ALL fields required (use [] or false if empty)
5. EXACT strings from code only
6. Root object directly, NO wrappers
7. CRITICAL: Use NESTED structure analysis.orphan.isOrphan, NEVER flat orphan: true
</output_rules><|im_end|>`,

  user: (metadata, code) => `<|im_start|>user
<target_file>
FILE: ${metadata.filePath}
EXPORTS: ${metadata.exportCount}
DEPENDENTS: ${metadata.dependentCount}
HAS_GLOBAL_ACCESS: ${metadata.hasGlobalAccess}
HAS_LOCALSTORAGE: ${metadata.hasLocalStorage}
HAS_EVENTS: ${metadata.hasEventListeners}

CODE:
${code}
</target_file>

Extract architectural patterns following the schema.<|im_end|>
<|im_start|>assistant`
};

// Test files - Archivos reales del escenario 2
const testFiles = [
  {
    name: 'GameStore.js',
    path: './test-cases/scenario-2-semantic/src/GameStore.js',
    expected: ['orphan', 'state-manager', 'shared-state'],
    metadata: {
      filePath: './test-cases/scenario-2-semantic/src/GameStore.js',
      exportCount: 3,
      dependentCount: 0,
      hasGlobalAccess: true,
      hasLocalStorage: false,
      hasEventListeners: false
    }
  },
  {
    name: 'EventBus.js', 
    path: './test-cases/scenario-2-semantic/src/EventBus.js',
    expected: ['orphan', 'singleton', 'event-hub'],
    metadata: {
      filePath: './test-cases/scenario-2-semantic/src/EventBus.js',
      exportCount: 3,
      dependentCount: 0,
      hasGlobalAccess: true,
      hasLocalStorage: false,
      hasEventListeners: true
    }
  },
  {
    name: 'Player.js',
    path: './test-cases/scenario-2-semantic/src/Player.js',
    expected: ['orphan', 'entity', 'shared-state'],
    metadata: {
      filePath: './test-cases/scenario-2-semantic/src/Player.js',
      exportCount: 1,
      dependentCount: 0,
      hasGlobalAccess: true,
      hasLocalStorage: false,
      hasEventListeners: false
    }
  },
  {
    name: 'GameEvents.js',
    path: './test-cases/scenario-2-semantic/src/GameEvents.js',
    expected: ['orphan', 'event-constants', 'shared-state'],
    metadata: {
      filePath: './test-cases/scenario-2-semantic/src/GameEvents.js',
      exportCount: 1,
      dependentCount: 0,
      hasGlobalAccess: true,
      hasLocalStorage: false,
      hasEventListeners: false
    }
  },
  {
    name: 'UI.js',
    path: './test-cases/scenario-2-semantic/src/UI.js',
    expected: ['orphan', 'ui-component', 'event-listener'],
    metadata: {
      filePath: './test-cases/scenario-2-semantic/src/UI.js',
      exportCount: 3,
      dependentCount: 0,
      hasGlobalAccess: true,
      hasLocalStorage: false,
      hasEventListeners: true
    }
  },
  {
    name: 'Analytics.js',
    path: './test-cases/scenario-2-semantic/src/Analytics.js',
    expected: ['orphan', 'side-effects', 'api-calls'],
    metadata: {
      filePath: './test-cases/scenario-2-semantic/src/Analytics.js',
      exportCount: 3,
      dependentCount: 0,
      hasGlobalAccess: true,
      hasLocalStorage: false,
      hasEventListeners: false
    }
  }
];

async function runTest() {
  console.log('🧪 Testing Comprehensive Prompt (LFM2.5 Optimized)\n');
  console.log('='.repeat(80));
  
  // Load AI config
  const { loadAIConfig, LLMClient } = await import('./src/ai/llm-client.js');
  const aiConfig = await loadAIConfig();
  
  const client = new LLMClient(aiConfig);
  
  // Verificar que el servidor esté disponible
  console.log('🔍 Checking LLM server availability...');
  const health = await client.healthCheck();
  console.log(`  GPU: ${health.gpu ? '✅ Available' : '❌ Not available'}`);
  console.log(`  CPU: ${health.cpu ? '✅ Available' : '❌ Not available'}`);
  
  if (!health.gpu && !health.cpu) {
    console.error('❌ No LLM servers available. Please start the LLM server first.');
    process.exit(1);
  }
  
  const results = [];
  
  for (const testFile of testFiles) {
    console.log(`\n📄 Testing: ${testFile.name}`);
    console.log('-'.repeat(80));
    
    try {
      // Leer código
      const code = await fs.readFile(testFile.path, 'utf-8');
      
      // Usar metadata del test file
      const metadata = testFile.metadata;
      
      console.log('⏳ Sending to LLM...');
      const startTime = Date.now();
      
      const response = await client.analyze(
        comprehensivePrompt.user(metadata, code),
        { 
          systemPrompt: comprehensivePrompt.system, 
          mode: 'gpu',
          temperature: 0.0  // CRITICAL: Greedy decoding for consistent JSON
        }
      );
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ Response received in ${duration}ms\n`);
      console.log('📊 Results:');
      console.log(JSON.stringify(response, null, 2));
      
      // Verificar qué patrones detectó
      console.log('\n🔍 Pattern Detection:');
      console.log(`  Primary Archetype: ${response.primaryArchetype || 'N/A'}`);
      console.log(`  Characteristics: ${response.characteristics?.join(', ') || 'None'}`);
      console.log(`  Confidence: ${response.confidence || 0}`);
      
      // Validación de Orphan
      const orphanStatus = response.analysis?.orphan;
      const expectedOrphan = testFile.metadata.dependentCount === 0;
      const orphanCorrect = orphanStatus?.isOrphan === expectedOrphan;
      console.log(`\n  📦 Orphan Analysis:`);
      console.log(`    Expected: ${expectedOrphan ? 'YES' : 'NO'} (dependentCount=${testFile.metadata.dependentCount})`);
      console.log(`    Detected: ${orphanStatus?.isOrphan === true ? 'YES' : orphanStatus?.isOrphan === false ? 'NO' : 'N/A'}`);
      console.log(`    Status: ${orphanCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
      if (orphanStatus?.suggestions?.length > 0) {
        console.log(`    Suggestions: ${orphanStatus.suggestions.slice(0, 2).join(', ')}${orphanStatus.suggestions.length > 2 ? '...' : ''}`);
      }
      
      // Shared State
      const sharedState = response.analysis?.semantic?.sharedState || [];
      console.log(`\n  💾 Shared State (${sharedState.length} variables):`);
      sharedState.forEach((s, i) => {
        console.log(`    ${i + 1}. ${s.variable}: ${s.accessType} - ${s.purpose?.substring(0, 50)}${s.purpose?.length > 50 ? '...' : ''}`);
      });
      
      // Events
      const events = response.analysis?.semantic?.events || {};
      const emits = events.emits || [];
      const listens = events.listens || [];
      console.log(`\n  📡 Events:`);
      console.log(`    Emits (${emits.length}): ${emits.slice(0, 3).join(', ') || 'None'}${emits.length > 3 ? '...' : ''}`);
      console.log(`    Listens (${listens.length}): ${listens.slice(0, 3).join(', ') || 'None'}${listens.length > 3 ? '...' : ''}`);
      
      // Patterns
      const patterns = response.analysis?.patterns || {};
      console.log(`\n  🎯 Patterns Detected:`);
      console.log(`    State Manager: ${patterns.isStateManager ? '✅' : '❌'}`);
      console.log(`    Singleton: ${patterns.isSingleton ? '✅' : '❌'}`);
      console.log(`    God Object: ${patterns.isGodObject ? '⚠️' : '❌'}`);
      console.log(`    Side Effects: ${patterns.hasSideEffects ? '⚠️' : '❌'}`);
      
      // Evaluar calidad
      console.log('\n📈 Quality Check:');
      const hasSpecificVars = sharedState.some(s => s.variable && s.variable !== 'unknown');
      const hasReasoning = response.reasoning && response.reasoning.length > 50;
      const hasSuggestions = orphanStatus?.suggestions?.length > 0;
      const hasEvents = emits.length > 0 || listens.length > 0;
      
      console.log(`  ✅ Specific variables: ${hasSpecificVars ? 'YES' : 'NO'}`);
      console.log(`  ✅ Events detected: ${hasEvents ? 'YES' : 'NO'}`);
      console.log(`  ✅ Detailed reasoning: ${hasReasoning ? 'YES' : 'NO'}`);
      console.log(`  ✅ Actionable suggestions: ${hasSuggestions ? 'YES' : 'NO'}`);
      console.log(`  ✅ Orphan detection: ${orphanCorrect ? 'YES' : 'NO'}`);
      
      // Score total
      const qualityScore = [
        hasSpecificVars,
        hasEvents,
        hasReasoning,
        hasSuggestions,
        orphanCorrect
      ].filter(Boolean).length;
      console.log(`\n  ⭐ Quality Score: ${qualityScore}/5`);
      
      results.push({
        file: testFile.name,
        qualityScore,
        orphanCorrect,
        duration
      });
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      results.push({
        file: testFile.name,
        qualityScore: 0,
        orphanCorrect: false,
        duration: 0,
        error: error.message
      });
    }
    
    console.log('\n' + '='.repeat(80));
  }
  
  // Resumen final
  console.log('\n📊 FINAL SUMMARY');
  console.log('='.repeat(80));
  const totalScore = results.reduce((sum, r) => sum + r.qualityScore, 0);
  const avgScore = (totalScore / (results.length * 5) * 100).toFixed(1);
  const orphanAccuracy = results.filter(r => r.orphanCorrect).length / results.length * 100;
  const avgDuration = (results.reduce((sum, r) => sum + r.duration, 0) / results.length / 1000).toFixed(1);
  
  console.log(`\n  📁 Files tested: ${results.length}`);
  console.log(`  ⭐ Average Quality: ${avgScore}%`);
  console.log(`  🎯 Orphan Accuracy: ${orphanAccuracy}%`);
  console.log(`  ⏱️  Average Time: ${avgDuration}s`);
  console.log(`\n  Individual Scores:`);
  results.forEach(r => {
    const status = r.error ? '❌' : r.qualityScore >= 4 ? '✅' : r.qualityScore >= 3 ? '⚠️' : '❌';
    console.log(`    ${status} ${r.file}: ${r.qualityScore}/5 (${r.duration}ms)`);
  });
  
  console.log('\n✅ Test completed!');
}

runTest().catch(console.error);
