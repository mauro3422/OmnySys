#!/usr/bin/env node

/**
 * Prompt Testing Tool - Prueba diferentes estrategias de prompting
 * 
 * Uso: node scripts/test-prompt-strategy.js <strategy-name> <test-case>
 * 
 * Strategies:
 *   - few-shot: Ejemplos few-shot (actual)
 *   - zero-shot: Solo instrucciones sin ejemplos
 *   - schema-only: Solo schema JSON
 *   - detailed: Instrucciones muy detalladas
 * 
 * Test cases:
 *   - localstorage: AuthService/ApiClient
 *   - shared-state: GameStore/EventBus
 *   - orphan: Módulo huérfano
 *   - dynamic: Imports dinámicos
 */

import { LLMClient } from '../src/ai/llm-client.js';
import fs from 'fs/promises';
import path from 'path';

const STRATEGIES = {
  'few-shot': '../src/layer-b-semantic/prompt-engine/prompt-templates/semantic-connections.js',
  'zero-shot': './prompt-strategies/zero-shot.js',
  'schema-only': './prompt-strategies/schema-only.js',
  'detailed': './prompt-strategies/detailed.js'
};

const TEST_CASES = {
  'localstorage': {
    name: 'localStorage Bridge',
    description: 'AuthService escribe auth_token, ApiClient lo lee',
    files: [
      {
        filePath: 'src/AuthService.js',
        code: `export function login(username, password) {
    const fakeToken = "jwt_token_12345";
    localStorage.setItem('auth_token', fakeToken);
}

export function logout() {
    localStorage.removeItem('auth_token');
}`,
        metadata: {
          filePath: 'src/AuthService.js',
          exportCount: 2,
          dependentCount: 1,
          hasLocalStorage: true,
          localStorageKeys: [],
          hasGlobalAccess: false,
          hasEventListeners: false,
          eventNames: []
        }
      },
      {
        filePath: 'src/ApiClient.js',
        code: `export async function fetchData(endpoint) {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        throw new Error("No hay token de autenticación disponible");
    }
    console.log(\`Haciendo petición a \${endpoint} con token\`);
    return { data: "success" };
}`,
        metadata: {
          filePath: 'src/ApiClient.js',
          exportCount: 1,
          dependentCount: 3,
          hasLocalStorage: true,
          localStorageKeys: [],
          hasGlobalAccess: false,
          hasEventListeners: false,
          eventNames: []
        }
      }
    ]
  },
  'shared-state': {
    name: 'Shared State',
    description: 'GameStore y EventBus usan window.*',
    files: [
      {
        filePath: 'src/GameStore.js',
        code: `export function initGameState() {
  window.gameState = {
    score: 0,
    level: 1,
    playerName: '',
    isPlaying: false
  };
}

export function resetGameState() {
  if (window.gameState) {
    window.gameState.score = 0;
    window.gameState.level = 1;
  }
}

export function getGameState() {
  return window.gameState || null;
}`,
        metadata: {
          filePath: 'src/GameStore.js',
          exportCount: 3,
          dependentCount: 2,
          hasLocalStorage: false,
          localStorageKeys: [],
          hasGlobalAccess: true,
          hasEventListeners: false,
          eventNames: []
        }
      },
      {
        filePath: 'src/EventBus.js',
        code: `class EventBus {
  constructor() {
    this.listeners = {};
  }
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }
}

window.eventBus = new EventBus();
export { EventBus };`,
        metadata: {
          filePath: 'src/EventBus.js',
          exportCount: 1,
          dependentCount: 4,
          hasLocalStorage: false,
          localStorageKeys: [],
          hasGlobalAccess: true,
          hasEventListeners: true,
          eventNames: []
        }
      }
    ]
  },
  'orphan': {
    name: 'Orphan Module',
    description: 'Módulo sin dependencias',
    files: [
      {
        filePath: 'src/utils/helper.js',
        code: `export function formatDate(date) {
  return new Date(date).toISOString();
}

export function parseJSON(str) {
  return JSON.parse(str);
}`,
        metadata: {
          filePath: 'src/utils/helper.js',
          exportCount: 2,
          dependentCount: 0,
          hasJSDoc: false
        }
      }
    ]
  },
  'dynamic': {
    name: 'Dynamic Imports',
    description: 'Router con imports dinámicos',
    files: [
      {
        filePath: 'src/Router.js',
        code: `const routeMap = {
  '/user': () => import('./modules/UserModule.js'),
  '/admin': () => import('./modules/AdminModule.js'),
  '/dashboard': () => import('./modules/DashboardModule.js')
};

export function navigateTo(route) {
  const loader = routeMap[route];
  if (loader) return loader();
}`,
        metadata: {
          filePath: 'src/Router.js',
          exportCount: 1,
          dependentCount: 0,
          hasDynamicImports: true
        }
      }
    ]
  }
};

function generatePrompt(strategy, metadata, code) {
  const strategies = {
    'few-shot': generateFewShotPrompt,
    'zero-shot': generateZeroShotPrompt,
    'schema-only': generateSchemaOnlyPrompt,
    'detailed': generateDetailedPrompt
  };
  
  const generator = strategies[strategy];
  if (!generator) {
    throw new Error(`Unknown strategy: ${strategy}`);
  }
  
  return generator(metadata, code);
}

function generateFewShotPrompt(metadata, code) {
  // Template actual con few-shot examples
  return {
    systemPrompt: `<|im_start|>system
You are a specialized data extractor for semantic connections analysis. Return ONLY valid JSON.

<schema>
Root object schema (NO wrappers):
{
  "confidence": 0.0-1.0,
  "reasoning": "string",
  "localStorageKeys": ["string"],
  "eventNames": ["string"],
  "connections": [{
    "source": "string",
    "target": "string",
    "key": "string",
    "type": "localStorage|event|shared-state",
    "confidence": 0.0-1.0
  }],
  "sharedState": [{
    "key": "string",
    "accessType": "read|write|both",
    "files": ["string"],
    "confidence": 0.0-1.0
  }]
}
</schema>

<instructions>
- confidence: certainty of semantic connections detection (0.0-1.0)
- reasoning: 1 sentence explaining what connections were found
- localStorageKeys: array of localStorage keys used (setItem/getItem/removeItem)
- eventNames: array of event names used (addEventListener/dispatchEvent)
- connections: array of file-to-file connections via shared state or events
- sharedState: array of shared state patterns with access types
- Use exact strings found in code
- DO NOT assume connections not explicitly coded
- NO wrappers, NO extra objects, return root object directly
</instructions>

<examples>
Example 1 - localStorage connections:
<|im_start|>user
FILE: src/AuthStore.js
EXPORTS: 2 (login, logout)
DEPENDENTS: 3
HAS_LOCAL_STORAGE: true
HAS_EVENT_LISTENERS: false
LOCAL_STORAGE_KEYS:
EVENT_NAMES:

CODE:
export function login(token) {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('user_prefs', JSON.stringify({ theme: 'dark' }));
}

export function logout() {
  localStorage.removeItem('auth_token');
}

Extract semantic connections as JSON.<|im_end|>
<|im_start|>assistant
{"confidence":0.95,"reasoning":"Module uses localStorage for auth_token and user_prefs","localStorageKeys":["auth_token","user_prefs"],"eventNames":[],"connections":[],"sharedState":[{"key":"auth_token","accessType":"write","files":["src/AuthStore.js"],"confidence":0.95},{"key":"user_prefs","accessType":"write","files":["src/AuthStore.js"],"confidence":0.95}]}<|im_end|>

Example 2 - Event connections:
<|im_start|>user
FILE: src/EventBus.js
EXPORTS: 2 (emit, on)
DEPENDENTS: 5
HAS_LOCAL_STORAGE: false
HAS_EVENT_LISTENERS: true
LOCAL_STORAGE_KEYS:
EVENT_NAMES:

CODE:
export function on(event, handler) {
  window.addEventListener(event, handler);
}

export function emit(event, data) {
  window.dispatchEvent(new CustomEvent(event, { detail: data }));
}

Extract semantic connections as JSON.<|im_end|>
<|im_start|>assistant
{"confidence":0.95,"reasoning":"Module provides event bus using addEventListener and dispatchEvent","localStorageKeys":[],"eventNames":[],"connections":[],"sharedState":[]}<|im_end|>
</examples><|im_end|>`,
    
    userPrompt: `<|im_start|>user
<file_info>
FILE: ${metadata.filePath}
EXPORTS: ${metadata.exportCount}
DEPENDENTS: ${metadata.dependentCount}
HAS_LOCAL_STORAGE: ${metadata.hasLocalStorage || false}
HAS_EVENT_LISTENERS: ${metadata.hasEventListeners || false}
LOCAL_STORAGE_KEYS: ${(metadata.localStorageKeys || []).join(', ')}
EVENT_NAMES: ${(metadata.eventNames || []).join(', ')}
</file_info>

<code>
${code}
</code>

Extract semantic connections as JSON following the schema and examples above.<|im_end|>
<|im_start|>assistant`
  };
}

function generateZeroShotPrompt(metadata, code) {
  // Sin ejemplos, solo instrucciones
  return {
    systemPrompt: `<|im_start|>system
You are a specialized data extractor for semantic connections analysis.

TASK: Analyze the provided JavaScript code and extract semantic connections.

SCHEMA - Return ONLY this JSON structure:
{
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of what you found",
  "localStorageKeys": ["keys found in localStorage.setItem/getItem/removeItem calls"],
  "eventNames": ["event names found in addEventListener/dispatchEvent calls"],
  "connections": [],
  "sharedState": [
    {
      "key": "variable name",
      "accessType": "read|write|both",
      "files": ["${metadata.filePath}"],
      "confidence": 0.0-1.0
    }
  ]
}

RULES:
1. Analyze ONLY the CODE provided below
2. Extract ONLY what is explicitly in the code
3. Look for: localStorage calls, window.* assignments, event listeners
4. Return exact strings found in code
5. NO markdown, NO explanation outside JSON
6. Confidence: 0.0 (unsure) to 1.0 (certain)<|im_end|>`,
    
    userPrompt: `<|im_start|>user
FILE: ${metadata.filePath}

CODE:
${code}

Analyze this code and return JSON with semantic connections.<|im_end|>
<|im_start|>assistant`
  };
}

function generateSchemaOnlyPrompt(metadata, code) {
  // Solo schema, mínimas instrucciones
  return {
    systemPrompt: `<|im_start|>system
Return JSON matching this schema:
{
  "confidence": number,
  "reasoning": string,
  "localStorageKeys": string[],
  "eventNames": string[],
  "connections": [],
  "sharedState": [{"key": string, "accessType": "read|write|both", "files": string[], "confidence": number}]
}

Extract from code: localStorage keys, event names, window.* variables<|im_end|>`,
    
    userPrompt: `<|im_start|>user
${code}

JSON:<|im_end|>
<|im_start|>assistant`
  };
}

function generateDetailedPrompt(metadata, code) {
  // Instrucciones muy detalladas sin ejemplos
  return {
    systemPrompt: `<|im_start|>system
You are a code analyzer. Extract semantic connections from JavaScript code.

OUTPUT FORMAT - JSON only:
{
  "confidence": 0.0-1.0,
  "reasoning": "One sentence describing what connections exist in THIS code",
  "localStorageKeys": ["extracted keys from localStorage calls"],
  "eventNames": ["extracted event names"],
  "connections": [],
  "sharedState": [
    {
      "key": "name of window.* variable or localStorage key",
      "accessType": "read|write|both",
      "files": ["${metadata.filePath}"],
      "confidence": 0.0-1.0
    }
  ]
}

WHAT TO LOOK FOR IN THE CODE:
1. localStorage.setItem('key', value) → add 'key' to localStorageKeys, accessType: "write"
2. localStorage.getItem('key') → add 'key' to localStorageKeys, accessType: "read"
3. localStorage.removeItem('key') → add 'key' to localStorageKeys, accessType: "write"
4. window.variableName = value → add 'variableName' to sharedState, accessType: "write"
5. window.addEventListener('eventName', ...) → add 'eventName' to eventNames
6. window.dispatchEvent(new CustomEvent('eventName', ...)) → add 'eventName' to eventNames

CRITICAL RULES:
- ONLY analyze the code provided in the user message
- ONLY extract strings that literally appear in the code
- If no localStorage calls: localStorageKeys = []
- If no window.* assignments: sharedState = []
- If no event calls: eventNames = []
- Do NOT invent keys, events, or variables not in the code
- Return valid JSON only<|im_end|>`,
    
    userPrompt: `<|im_start|>user
Analyze this JavaScript file:

File: ${metadata.filePath}

Code:
${code}

Extract semantic connections as JSON.
Remember: Only extract what is literally in this code.<|im_end|>
<|im_start|>assistant`
  };
}

async function testStrategy(strategyName, testCaseName) {
  console.log('='.repeat(80));
  console.log(`Testing Strategy: ${strategyName}`);
  console.log(`Test Case: ${testCaseName}`);
  console.log('='.repeat(80));
  
  const testCase = TEST_CASES[testCaseName];
  if (!testCase) {
    console.error(`Unknown test case: ${testCaseName}`);
    console.log('Available test cases:', Object.keys(TEST_CASES).join(', '));
    return;
  }
  
  console.log(`Description: ${testCase.description}`);
  console.log();
  
  const config = {
    llm: {
      gpu: { port: 8000 },
      cpu: { port: 8002 }
    },
    performance: {
      timeout: 60000,
      enableCPUFallback: false
    }
  };
  
  const client = new LLMClient(config);
  const health = await client.healthCheck();
  
  if (!health.gpu) {
    console.error('❌ GPU server not available');
    return;
  }
  
  const results = [];
  
  for (const file of testCase.files) {
    console.log(`\n📄 File: ${file.filePath}`);
    console.log('-'.repeat(80));
    
    const prompt = generatePrompt(strategyName, file.metadata, file.code);
    
    console.log('System Prompt Length:', prompt.systemPrompt.length, 'chars');
    console.log('User Prompt Length:', prompt.userPrompt.length, 'chars');
    
    try {
      const startTime = Date.now();
      const response = await client.analyze(prompt.userPrompt, {
        systemPrompt: prompt.systemPrompt,
        mode: 'gpu'
      });
      const duration = Date.now() - startTime;
      
      console.log(`\n⏱️  Response time: ${duration}ms`);
      console.log('\n🤖 LLM Response:');
      console.log(JSON.stringify(response, null, 2));
      
      // Evaluate response quality
      const evaluation = evaluateResponse(response, file);
      results.push({
        file: file.filePath,
        evaluation,
        response
      });
      
      console.log('\n📊 Evaluation:');
      console.log(`  ✅ Correct localStorage keys: ${evaluation.correctLocalStorageKeys ? 'YES' : 'NO'}`);
      console.log(`  ✅ Correct event names: ${evaluation.correctEventNames ? 'YES' : 'NO'}`);
      console.log(`  ✅ Correct shared state: ${evaluation.correctSharedState ? 'YES' : 'NO'}`);
      console.log(`  ✅ No hallucinations: ${evaluation.noHallucinations ? 'YES' : 'NO'}`);
      console.log(`  ✅ Accurate reasoning: ${evaluation.accurateReasoning ? 'YES' : 'NO'}`);
      console.log(`  Overall Score: ${evaluation.score}/5`);
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      results.push({
        file: file.filePath,
        error: error.message
      });
    }
    
    console.log('\n' + '-'.repeat(80));
  }
  
  // Summary
  console.log('\n📈 SUMMARY');
  console.log('='.repeat(80));
  const totalScore = results.reduce((sum, r) => sum + (r.evaluation?.score || 0), 0);
  const maxScore = results.length * 5;
  console.log(`Total Score: ${totalScore}/${maxScore} (${((totalScore/maxScore)*100).toFixed(1)}%)`);
  
  return results;
}

function evaluateResponse(response, file) {
  const evaluation = {
    correctLocalStorageKeys: false,
    correctEventNames: false,
    correctSharedState: false,
    noHallucinations: false,
    accurateReasoning: false,
    score: 0
  };
  
  // Extract expected values from code
  const expectedLocalStorageKeys = extractLocalStorageKeys(file.code);
  const expectedEventNames = extractEventNames(file.code);
  const expectedSharedState = extractSharedState(file.code);
  
  // Check localStorage keys
  const actualLocalStorageKeys = response.localStorageKeys || [];
  evaluation.correctLocalStorageKeys = 
    arraysEqual(actualLocalStorageKeys.sort(), expectedLocalStorageKeys.sort());
  
  // Check event names
  const actualEventNames = response.eventNames || [];
  evaluation.correctEventNames = 
    arraysEqual(actualEventNames.sort(), expectedEventNames.sort());
  
  // Check shared state
  const actualSharedState = (response.sharedState || []).map(s => s.key);
  evaluation.correctSharedState = 
    arraysEqual(actualSharedState.sort(), expectedSharedState.sort());
  
  // Check for hallucinations (keys/events not in code)
  const hallucinatedKeys = actualLocalStorageKeys.filter(k => !expectedLocalStorageKeys.includes(k));
  const hallucinatedEvents = actualEventNames.filter(e => !expectedEventNames.includes(e));
  evaluation.noHallucinations = hallucinatedKeys.length === 0 && hallucinatedEvents.length === 0;
  
  // Check reasoning accuracy
  const reasoning = (response.reasoning || '').toLowerCase();
  const hasLocalStorage = expectedLocalStorageKeys.length > 0;
  const hasEvents = expectedEventNames.length > 0;
  const hasSharedState = expectedSharedState.length > 0;
  
  evaluation.accurateReasoning = true;
  if (hasLocalStorage && !reasoning.includes('localstorage')) evaluation.accurateReasoning = false;
  if (hasEvents && !reasoning.includes('event')) evaluation.accurateReasoning = false;
  if (hasSharedState && !reasoning.includes('window')) evaluation.accurateReasoning = false;
  
  // Calculate score
  if (evaluation.correctLocalStorageKeys) evaluation.score++;
  if (evaluation.correctEventNames) evaluation.score++;
  if (evaluation.correctSharedState) evaluation.score++;
  if (evaluation.noHallucinations) evaluation.score++;
  if (evaluation.accurateReasoning) evaluation.score++;
  
  return evaluation;
}

function extractLocalStorageKeys(code) {
  const keys = [];
  const setItemMatches = code.matchAll(/localStorage\.setItem\(['"`]([^'"`]+)['"`]/g);
  const getItemMatches = code.matchAll(/localStorage\.getItem\(['"`]([^'"`]+)['"`]/g);
  const removeItemMatches = code.matchAll(/localStorage\.removeItem\(['"`]([^'"`]+)['"`]/g);
  
  for (const match of setItemMatches) keys.push(match[1]);
  for (const match of getItemMatches) keys.push(match[1]);
  for (const match of removeItemMatches) keys.push(match[1]);
  
  return [...new Set(keys)];
}

function extractEventNames(code) {
  const names = [];
  const listenerMatches = code.matchAll(/addEventListener\(['"`]([^'"`]+)['"`]/g);
  const dispatchMatches = code.matchAll(/dispatchEvent\([^)]*['"`]([^'"`]+)['"`]/g);
  const customEventMatches = code.matchAll(/new CustomEvent\(['"`]([^'"`]+)['"`]/g);
  
  for (const match of listenerMatches) names.push(match[1]);
  for (const match of dispatchMatches) names.push(match[1]);
  for (const match of customEventMatches) names.push(match[1]);
  
  return [...new Set(names)];
}

function extractSharedState(code) {
  const state = [];
  const windowMatches = code.matchAll(/window\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g);
  
  for (const match of windowMatches) {
    state.push(match[1]);
  }
  
  return [...new Set(state)];
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Main
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node test-prompt-strategy.js <strategy> <test-case>');
    console.log('');
    console.log('Strategies:');
    console.log('  few-shot     - Current template with examples');
    console.log('  zero-shot    - Instructions only, no examples');
    console.log('  schema-only  - Minimal schema, no instructions');
    console.log('  detailed     - Very detailed instructions');
    console.log('');
    console.log('Test cases:');
    Object.entries(TEST_CASES).forEach(([key, value]) => {
      console.log(`  ${key.padEnd(12)} - ${value.description}`);
    });
    console.log('');
    console.log('Example:');
    console.log('  node test-prompt-strategy.js zero-shot localstorage');
    process.exit(1);
  }
  
  const [strategy, testCase] = args;
  
  if (!STRATEGIES[strategy]) {
    console.error(`Unknown strategy: ${strategy}`);
    console.log('Available strategies:', Object.keys(STRATEGIES).join(', '));
    process.exit(1);
  }
  
  if (!TEST_CASES[testCase]) {
    console.error(`Unknown test case: ${testCase}`);
    console.log('Available test cases:', Object.keys(TEST_CASES).join(', '));
    process.exit(1);
  }
  
  try {
    await testStrategy(strategy, testCase);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
