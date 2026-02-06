/**
 * @fileoverview index.js
 * 
 * LLM Analyzer - Analizador semántico basado en LLM
 * 
 * Casos de uso (cuando regex/AST no es suficiente):
 * - Indirección: const state = window.gameState; state.score = 10;
 * - Propiedades dinámicas: window[propName] = value;
 * - Razonamiento contextual: ¿Qué archivos afecta este cambio?
 * - Patrones no obvios: callbacks, closures, event handlers indirectos
 * 
 * @module llm-analyzer
 */

// Clase principal
export { LLMAnalyzer } from './core.js';

// Funciones utilidad
export { 
  buildPrompt 
} from './prompt-builder.js';

export { 
  normalizeResponse,
  normalizeSharedStateFromSimple,
  extractValidFilePaths
} from './response-normalizer.js';

export { 
  needsLLMAnalysis 
} from './analysis-decider.js';
