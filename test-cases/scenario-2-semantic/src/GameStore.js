// GameStore.js - Define estado global compartido
// ⚠️ Este archivo crea estado en window.gameState

/**
 * Inicializa el estado global del juego
 * SIDE EFFECT: Crea window.gameState
 */
export function initGameState() {
  window.gameState = {
    score: 0,
    level: 1,
    playerName: '',
    isPlaying: false
  };
}

/**
 * Resetea el estado del juego
 */
export function resetGameState() {
  if (window.gameState) {
    window.gameState.score = 0;
    window.gameState.level = 1;
    window.gameState.isPlaying = false;
  }
}

/**
 * Obtiene el estado actual del juego
 */
export function getGameState() {
  return window.gameState || null;
}
