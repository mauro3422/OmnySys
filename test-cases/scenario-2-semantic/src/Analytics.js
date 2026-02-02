// Analytics.js - Sistema de analíticas
// ⚠️ NO importa EventBus pero usa window.eventBus
// ⚠️ Conexión semántica: EVENT_LISTENER con EventBus.js y GameEvents.js
// ⚠️ Side effect: hace network calls

/**
 * Envía evento de analítica al servidor
 * SIDE EFFECT: Hace fetch (network call)
 */
function sendAnalytics(eventName, data) {
  fetch('/api/analytics', {
    method: 'POST',
    body: JSON.stringify({ event: eventName, data, timestamp: Date.now() })
  }).catch(err => console.error('Analytics error:', err));
}

/**
 * Inicializa el sistema de analíticas
 * Registra listeners en window.eventBus
 */
export function initAnalytics() {
  if (window.eventBus) {
    // Escuchar eventos del juego
    window.eventBus.on('game:start', (data) => {
      sendAnalytics('game_started', { playerName: data.playerName });
    });

    window.eventBus.on('game:score', (data) => {
      sendAnalytics('score_updated', { score: data.score, level: data.level });
    });

    window.eventBus.on('game:levelup', (data) => {
      sendAnalytics('level_up', { newLevel: data.level });
    });

    window.eventBus.on('game:end', (data) => {
      sendAnalytics('game_ended', { finalScore: data.score, level: data.level });
    });
  }
}

/**
 * Desactiva analíticas
 */
export function disableAnalytics() {
  if (window.eventBus) {
    window.eventBus.off('game:start');
    window.eventBus.off('game:score');
    window.eventBus.off('game:levelup');
    window.eventBus.off('game:end');
  }
}
