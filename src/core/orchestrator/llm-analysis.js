/**
 * @fileoverview LLM Analysis Module
 *
 * Analiza archivos complejos con LLM basado en metadatos de Layer A.
 *
 * @module core/orchestrator/llm-analysis
 */

// Importar funciones individuales para evitar cargar dependencias pesadas en tests
import { calculateContentHash } from './llm-analysis/hash-utils.js';
import { shouldUseLLM } from './llm-analysis/llm-decision.js';
import { calculateLLMPriority as _calculateLLMPriority } from './llm-analysis/file-processor.js';

// Re-exportar para tests que usan named imports
export { calculateContentHash } from './llm-analysis/hash-utils.js';
export { shouldUseLLM } from './llm-analysis/llm-decision.js';
export { calculateLLMPriority as _calculateLLMPriority } from './llm-analysis/file-processor.js';

// Importación lazy para la función principal (solo cuando se usa realmente)
export async function _analyzeComplexFilesWithLLM(context) {
  const { analyzeComplexFilesWithLLM } = await import('./llm-analysis/index.js');
  return analyzeComplexFilesWithLLM(context);
}

export default {
  _analyzeComplexFilesWithLLM,
  calculateContentHash,
  shouldUseLLM,
  _calculateLLMPriority
};
