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
    const readProps = Array.isArray(sharedState.reads) ? sharedState.reads : 
                      Array.isArray(sharedState.readProperties) ? sharedState.readProperties : [];
    const writeProps = Array.isArray(sharedState.writes) ? sharedState.writes : 
                      Array.isArray(sharedState.writeProperties) ? sharedState.writeProperties : [];

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
      const emitters = Array.isArray(semantic.eventPatterns.eventEmitters) ? semantic.eventPatterns.eventEmitters : [];
      const listeners = Array.isArray(semantic.eventPatterns.eventListeners) ? semantic.eventPatterns.eventListeners : [];
      
      emitters.forEach(event => {
        state.events.emitters[event] = state.events.emitters[event] || [];
        state.events.emitters[event].push(filePath);
      });

      listeners.forEach(event => {
        state.events.listeners[event] = state.events.listeners[event] || [];
        state.events.listeners[event].push(filePath);
      });
    }

    // Guardar referencia al análisis completo
    state.files[filePath] = analysis;
  }

  return state;
}
