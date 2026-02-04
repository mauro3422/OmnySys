/**
 * LegacyAnalytics.js
 * 
 * TRAP: Archivo HUÉRFANO con side effects sospechosos.
 * No es importado por nadie, pero muta global state y localStorage.
 * 
 * ¿Es código muerto o se carga de otra forma (script tag)?
 */

// Side effect inmediato al cargar
console.log('[LegacyAnalytics] Initializing...');

// Muta global state - detectable por static analysis
window.legacyAnalytics = {
  version: '1.0.0',
  enabled: true,
  queue: []
};

// Usa localStorage - side effect sospechoso
const legacyData = localStorage.getItem('legacy_analytics');
if (legacyData) {
  window.legacyAnalytics.data = JSON.parse(legacyData);
}

// Función que muta localStorage
function saveToLegacyStorage(key, value) {
  const data = JSON.parse(localStorage.getItem('legacy_analytics') || '{}');
  data[key] = value;
  localStorage.setItem('legacy_analytics', JSON.stringify(data));
}

// Otra mutación global
window.trackLegacyEvent = function(event) {
  window.legacyAnalytics.queue.push(event);
  saveToLegacyStorage('queue', window.legacyAnalytics.queue);
};

// Export vacío - este archivo solo corre por sus side effects
export {};
