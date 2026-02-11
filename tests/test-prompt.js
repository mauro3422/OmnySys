/**
 * Test para verificar el prompt generado
 */

import promptEngine from './src/layer-b-semantic/prompt-engine/index.js';

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

const code = `
/**
 * Inicializa el estado global del juego
 */
export function initGameState() {
  window.gameState = {
    score: 0,
    level: 1,
    lives: 3
  };
}

/**
 * Resetea el estado del juego
 */
export function resetGameState() {
  window.gameState.score = 0;
  window.gameState.level = 1;
  window.gameState.lives = 3;
}

/**
 * Obtiene el estado actual del juego
 */
export function getGameState() {
  return window.gameState;
}
`;

async function test() {
  console.log('Testing prompt generation...\n');
  
  const promptConfig = await promptEngine.generatePrompt(metadata, code);
  
  console.log('Analysis Type:', promptConfig.analysisType);
  console.log('\n=== SYSTEM PROMPT ===');
  console.log(promptConfig.systemPrompt.substring(0, 500) + '...');
  console.log('\n=== USER PROMPT ===');
  console.log(promptConfig.userPrompt);
}

test().catch(console.error);
