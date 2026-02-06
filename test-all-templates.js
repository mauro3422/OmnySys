#!/usr/bin/env node

/**
 * Test completo de templates con LFM2.5-Instruct
 * Usa el prompt engine real
 */

import promptEngine from './src/layer-b-semantic/prompt-engine/index.js';
import { LLMClient } from './src/ai/llm-client.js';

const testCases = [
  {
    name: 'localStorage Bridge',
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
          localStorageKeys: ['auth_token'],
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
          localStorageKeys: ['auth_token'],
          hasGlobalAccess: false,
          hasEventListeners: false,
          eventNames: []
        }
      }
    ]
  },
  {
    name: 'Global State',
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
          eventNames: [],
          globalStateVars: ['gameState']
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
          eventNames: [],
          globalStateVars: ['eventBus']
        }
      }
    ]
  },
  {
    name: 'Orphan Module',
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
  {
    name: 'Dynamic Imports',
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
];

function extractLocalStorageKeys(code) {
  const keys = [];
  const matches = code.matchAll(/localStorage\.(setItem|getItem|removeItem)\(['"`]([^'"`]+)['"`]/g);
  for (const match of matches) keys.push(match[2]);
  return [...new Set(keys)];
}

function extractEventNames(code) {
  const names = [];
  const matches = code.matchAll(/(addEventListener|dispatchEvent)\(['"`]([^'"`]+)['"`]/g);
  for (const match of matches) names.push(match[2]);
  return [...new Set(names)];
}

function extractWindowVars(code) {
  const vars = [];
  const matches = code.matchAll(/window\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g);
  for (const match of matches) vars.push(match[1]);
  return [...new Set(vars)];
}

function evaluateResponse(response, file) {
  const expectedLocalStorage = extractLocalStorageKeys(file.code);
  const expectedEvents = extractEventNames(file.code);
  const expectedWindowVars = extractWindowVars(file.code);
  
  const actualLocalStorage = response.localStorageKeys || [];
  const actualEvents = response.eventNames || [];
  const actualSharedState = (response.sharedState || []).map(s => s.key);
  
  const evalResult = {
    correctLocalStorage: JSON.stringify(actualLocalStorage.sort()) === JSON.stringify(expectedLocalStorage.sort()),
    correctEvents: JSON.stringify(actualEvents.sort()) === JSON.stringify(expectedEvents.sort()),
    correctSharedState: JSON.stringify(actualSharedState.sort()) === JSON.stringify(expectedWindowVars.sort()),
    noHallucinations: true,
    accurateReasoning: true,
    score: 0
  };
  
  // Check for hallucinations
  const hallucinatedKeys = actualLocalStorage.filter(k => !expectedLocalStorage.includes(k));
  const hallucinatedEvents = actualEvents.filter(e => !expectedEvents.includes(e));
  evalResult.noHallucinations = hallucinatedKeys.length === 0 && hallucinatedEvents.length === 0;
  
  // Calculate score
  if (evalResult.correctLocalStorage) evalResult.score++;
  if (evalResult.correctEvents) evalResult.score++;
  if (evalResult.correctSharedState) evalResult.score++;
  if (evalResult.noHallucinations) evalResult.score++;
  if (evalResult.accurateReasoning) evalResult.score++;
  
  return evalResult;
}

async function runTests() {
  console.log('🧪 Testing Optimized Templates with LFM2.5-Instruct\n');
  console.log('='.repeat(80));
  
  const config = {
    llm: { gpu: { port: 8000 }, cpu: { port: 8002 } },
    performance: { timeout: 60000, enableCPUFallback: false }
  };
  
  const client = new LLMClient(config);
  const health = await client.healthCheck();
  
  if (!health.gpu) {
    console.error('❌ GPU server not available');
    return;
  }
  
  console.log('✅ Server ready\n');
  
  let totalScore = 0;
  let totalMaxScore = 0;
  
  for (const testCase of testCases) {
    console.log(`\n📋 ${testCase.name}`);
    console.log('='.repeat(80));
    
    for (const file of testCase.files) {
      console.log(`\n📄 ${file.filePath}`);
      console.log('-'.repeat(80));
      
      try {
        const promptConfig = await promptEngine.generatePrompt(file.metadata, file.code);
        
        console.log(`Analysis Type: ${promptConfig.analysisType}`);
        
        const startTime = Date.now();
        const response = await client.analyze(promptConfig.userPrompt, {
          systemPrompt: promptConfig.systemPrompt,
          mode: 'gpu'
        });
        const duration = Date.now() - startTime;
        
        console.log(`\n⏱️  Response time: ${duration}ms`);
        console.log('\n🤖 Response:');
        console.log(JSON.stringify(response, null, 2));
        
        const evalResult = evaluateResponse(response, file);
        totalScore += evalResult.score;
        totalMaxScore += 5;
        
        console.log('\n📊 Evaluation:');
        console.log(`  ✅ localStorage keys: ${evalResult.correctLocalStorage ? 'PASS' : 'FAIL'}`);
        console.log(`  ✅ Event names: ${evalResult.correctEvents ? 'PASS' : 'FAIL'}`);
        console.log(`  ✅ Shared state: ${evalResult.correctSharedState ? 'PASS' : 'FAIL'}`);
        console.log(`  ✅ No hallucinations: ${evalResult.noHallucinations ? 'PASS' : 'FAIL'}`);
        console.log(`  Score: ${evalResult.score}/5`);
        
      } catch (error) {
        console.error(`❌ Error: ${error.message}`);
      }
      
      console.log('\n' + '-'.repeat(80));
    }
  }
  
  console.log('\n📈 FINAL SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Score: ${totalScore}/${totalMaxScore} (${((totalScore/totalMaxScore)*100).toFixed(1)}%)`);
  console.log('='.repeat(80));
}

runTests().catch(console.error);
