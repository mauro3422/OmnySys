/**
 * Test de Verificación de Conexiones Semánticas
 * 
 * Verifica que la IA detecte correctamente:
 * 1. Conexiones por estado compartido (window.*)
 * 2. Conexiones por localStorage
 * 3. Conexiones por eventos
 * 
 * Las respuestas deben fortalecer el contexto del proyecto, no solo describir el código.
 */

import promptEngine from './src/layer-b-semantic/prompt-engine/index.js';

const testScenarios = [
  {
    name: "localStorage Bridge - AuthService & ApiClient",
    description: "AuthService escribe 'auth_token' en localStorage, ApiClient lo lee. Deben detectar la conexión.",
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
          hasGlobalAccess: false
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
          hasGlobalAccess: false
        }
      }
    ]
  },
  {
    name: "Shared State - GameStore & EventBus",
    description: "GameStore crea window.gameState, EventBus crea window.eventBus. Deben detectar el patrón de estado global.",
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
          hasGlobalAccess: true,
          hasLocalStorage: false
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
          hasGlobalAccess: true,
          hasLocalStorage: false
        }
      }
    ]
  }
];

async function testSemanticConnections() {
  console.log('🔍 Testing Semantic Connection Detection\n');
  console.log('='.repeat(80));
  
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
  
  const { LLMClient } = await import('./src/ai/llm-client.js');
  const client = new LLMClient(config);
  
  const health = await client.healthCheck();
  console.log('Server health:', health);
  
  if (!health.gpu) {
    console.error('❌ GPU server not available');
    return;
  }
  
  for (const scenario of testScenarios) {
    console.log(`\n📋 Scenario: ${scenario.name}`);
    console.log(`📝 Description: ${scenario.description}`);
    console.log('='.repeat(80));
    
    for (const file of scenario.files) {
      console.log(`\n📄 File: ${file.filePath}`);
      console.log('-'.repeat(80));
      
      const promptConfig = await promptEngine.generatePrompt(file.metadata, file.code);
      
      console.log('Analysis Type:', promptConfig.analysisType);
      
      try {
        const response = await client.analyze(promptConfig.userPrompt, {
          systemPrompt: promptConfig.systemPrompt,
          mode: 'gpu'
        });
        
        console.log('\n🤖 LLM Response:');
        console.log(JSON.stringify(response, null, 2));
        
        // Verificar que la respuesta fortalezca las conexiones
        let hasValidConnections = false;
        let connectionDetails = [];
        
        // Verificar localStorage keys
        if (response.localStorageKeys && response.localStorageKeys.length > 0) {
          hasValidConnections = true;
          connectionDetails.push(`✅ Detected localStorage keys: ${response.localStorageKeys.join(', ')}`);
        }
        
        // Verificar shared state
        if (response.sharedState && (
          (response.sharedState.reads && response.sharedState.reads.length > 0) ||
          (response.sharedState.writes && response.sharedState.writes.length > 0)
        )) {
          hasValidConnections = true;
          const reads = response.sharedState.reads || [];
          const writes = response.sharedState.writes || [];
          connectionDetails.push(`✅ Detected shared state - reads: ${reads.join(', ') || 'none'}, writes: ${writes.join(', ') || 'none'}`);
        }
        
        // Verificar event names
        if (response.eventNames && response.eventNames.length > 0) {
          hasValidConnections = true;
          connectionDetails.push(`✅ Detected events: ${response.eventNames.join(', ')}`);
        }
        
        // Verificar connections array
        if (response.connections && response.connections.length > 0) {
          hasValidConnections = true;
          const connSummary = response.connections.map(c => `${c.type}(${c.key})`).join(', ');
          connectionDetails.push(`✅ Detected connections: ${connSummary}`);
        }
        
        // Verificar reasoning
        if (response.reasoning) {
          const reasoningLower = response.reasoning.toLowerCase();
          const hasContext = reasoningLower.includes('localstorage') || 
                            reasoningLower.includes('shared') || 
                            reasoningLower.includes('global') ||
                            reasoningLower.includes('event') ||
                            reasoningLower.includes('connection');
          
          if (hasContext) {
            connectionDetails.push(`✅ Reasoning provides context: "${response.reasoning}"`);
          } else {
            connectionDetails.push(`⚠️  Reasoning lacks context: "${response.reasoning}"`);
          }
        }
        
        if (hasValidConnections) {
          console.log('\n✅ VALID CONNECTIONS DETECTED:');
          connectionDetails.forEach(detail => console.log(`   ${detail}`));
        } else {
          console.log('\n❌ NO VALID CONNECTIONS DETECTED');
          console.log('   The response does not strengthen project context');
        }
        
        // Verificar confianza
        if (response.confidence < 0.5) {
          console.log(`⚠️  Low confidence: ${response.confidence}`);
        } else {
          console.log(`✅ Good confidence: ${response.confidence}`);
        }
        
      } catch (error) {
        console.error(`❌ Error: ${error.message}`);
      }
      
      console.log('\n' + '-'.repeat(80));
    }
    
    console.log('\n' + '='.repeat(80));
  }
  
  console.log('\n✅ Test completed!');
}

testSemanticConnections().catch(console.error);
