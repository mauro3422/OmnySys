// GameEvents.js - Emite eventos del juego
// ⚠️ NO importa EventBus pero usa window.eventBus
// ⚠️ Conexión semántica: EVENT_LISTENER con EventBus.js y Analytics.js

/**
 * Notifica que el juego inició
 */
export function notifyGameStart(playerName) {
  if (window.eventBus) {
    window.eventBus.emit('game:start', { playerName, timestamp: Date.now() });
  }
}

/**
 * Notifica cambio de puntaje
 */
export function notifyScoreChange(score, level) {
  if (window.eventBus) {
    window.eventBus.emit('game:score', { score, level, timestamp: Date.now() });
  }
}

/**
 * Notifica subida de nivel
 */
export function notifyLevelUp(newLevel) {
  if (window.eventBus) {
    window.eventBus.emit('game:levelup', { level: newLevel, timestamp: Date.now() });
  }
}

/**
 * Notifica que el juego terminó
 */
export function notifyGameEnd(finalScore, level) {
  if (window.eventBus) {
    window.eventBus.emit('game:end', { score: finalScore, level, timestamp: Date.now() });
  }
}
