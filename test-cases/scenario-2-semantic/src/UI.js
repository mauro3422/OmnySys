// UI.js - Gestiona la interfaz de usuario
// ⚠️ NO importa GameStore ni Player pero accede a window.gameState
// ⚠️ Conexión semántica: SHARED_STATE con GameStore.js y Player.js
// ⚠️ Side effect: Modifica DOM

/**
 * Muestra el puntaje en la UI
 * SIDE EFFECT: Lee window.gameState.score, modifica DOM
 */
export function displayScore() {
  const scoreElement = document.getElementById('score');
  if (scoreElement && window.gameState) {
    scoreElement.textContent = `Score: ${window.gameState.score}`;
  }
}

/**
 * Muestra el nivel en la UI
 * SIDE EFFECT: Lee window.gameState.level, modifica DOM
 */
export function displayLevel() {
  const levelElement = document.getElementById('level');
  if (levelElement && window.gameState) {
    levelElement.textContent = `Level: ${window.gameState.level}`;
  }
}

/**
 * Muestra el nombre del jugador
 * SIDE EFFECT: Lee window.gameState.playerName, modifica DOM
 */
export function displayPlayerName() {
  const nameElement = document.getElementById('player-name');
  if (nameElement && window.gameState) {
    nameElement.textContent = window.gameState.playerName;
  }
}

/**
 * Actualiza toda la UI
 * Combina todos los displays
 */
export function updateUI() {
  displayScore();
  displayLevel();
  displayPlayerName();
}
