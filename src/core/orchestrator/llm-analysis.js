/**
 * @fileoverview LLM Analysis Module
 * 
 * Analiza archivos complejos con LLM basado en metadatos de Layer A.
 * 
 * ⚠️ DEPRECATED: This file is kept for backward compatibility.
 * Please import directly from the llm-analysis/ directory:
 *   import { analyzeComplexFilesWithLLM } from './llm-analysis/index.js';
 * 
 * @module core/orchestrator/llm-analysis
 * @deprecated Use llm-analysis/ directory modules instead
 */

import { 
  analyzeComplexFilesWithLLM as analyzeWithLLMImpl,
  calculateContentHash,
  shouldUseLLM,
  _calculateLLMPriority
} from './llm-analysis/index.js';

// Función wrapper para mantener compatibilidad con el contexto `this`
export async function _analyzeComplexFilesWithLLM() {
  const context = {
    projectPath: this.projectPath,
    OmnySysDataPath: this.OmnySysDataPath,
    indexedFiles: this.indexedFiles,
    maxConcurrentAnalyses: this.maxConcurrentAnalyses,
    queue: this.queue,
    emit: this.emit.bind(this),
    _processNext: this._processNext.bind(this)
  };
  
  return analyzeWithLLMImpl(context);
}

export { calculateContentHash, shouldUseLLM, _calculateLLMPriority };

export default {
  _analyzeComplexFilesWithLLM,
  calculateContentHash,
  shouldUseLLM,
  _calculateLLMPriority
};
