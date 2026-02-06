// Player.js - Gestiona el jugador
// ⚠️ NO importa GameStore pero accede a window.gameState
// ⚠️ Conexión semántica: SHARED_STATE con GameStore.js y UI.js

/**
 * Incrementa el puntaje del jugador
 * SIDE EFFECT: Modifica window.gameState.score
 */
export function incrementScore(points) {
  if (window.gameState) {
    window.gameState.score += points;
  }
}

/**
 * Sube de nivel al jugador
 * SIDE EFFECT: Modifica window.gameState.level
 */
export function levelUp() {
  if (window.gameState) {
    window.gameState.level++;
    window.gameState.score = 0; // Reset score
  }
}

/**
 * Inicia el juego
 * SIDE EFFECT: Modifica window.gameState.isPlaying
 */
export function startGame(playerName) {
  if (window.gameState) {
    window.gameState.playerName = playerName;
    window.gameState.isPlaying = true;
  }
}

/**
 * Termina el juego
 */
export function endGame() {
  if (window.gameState) {
    window.gameState.isPlaying = false;
  }
}
