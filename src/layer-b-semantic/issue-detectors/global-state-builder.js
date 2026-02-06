/**
 * @fileoverview global-state-builder.js
 * 
 * Construye índices globales de estado compartido y eventos
 * 
 * @module issue-detectors/global-state-builder
 */

/**
 * Construye índices globales de estado compartido y eventos
 * @param {object} enrichedResults - Resultados del análisis enriquecido
 * @returns {object} - Estado global indexado
 */
export function buildGlobalState(enrichedResults) {
  const state = {
    sharedState: {
      reads: {},   // { "window.gameState": ["FileA.js", "FileB.js"] }
      writes: {}   // { "window.gameState": ["FileC.js"] }
    },
    events: {
      emitters: {},  // { "user:login": ["Button.js"] }
      listeners: {}  // { "user:login": ["Analytics.js"] }
    },
    files: {}
  };

  for (const [filePath, analysis] of Object.entries(enrichedResults.files || {})) {
    const semantic = analysis.semanticAnalysis || {};
    const sharedState = semantic.sharedState || {};
    const readProps = sharedState.reads || sharedState.readProperties || [];
    const writeProps = sharedState.writes || sharedState.writeProperties || [];

    // Indexar shared state
    readProps.forEach(prop => {
      state.sharedState.reads[prop] = state.sharedState.reads[prop] || [];
      state.sharedState.reads[prop].push(filePath);
    });

    writeProps.forEach(prop => {
      state.sharedState.writes[prop] = state.sharedState.writes[prop] || [];
      state.sharedState.writes[prop].push(filePath);
    });

    // Indexar eventos
    if (semantic.eventPatterns) {
      (semantic.eventPatterns.eventEmitters || []).forEach(event => {
        state.events.emitters[event] = state.events.emitters[event] || [];
        state.events.emitters[event].push(filePath);
      });

      (semantic.eventPatterns.eventListeners || []).forEach(event => {
        state.events.listeners[event] = state.events.listeners[event] || [];
        state.events.listeners[event].push(filePath);
      });
    }

    // Guardar referencia al análisis completo
    state.files[filePath] = analysis;
  }

  return state;
}
