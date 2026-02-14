/**
 * @fileoverview index.js
 * 
 * Main entry point for the LLM Service module.
 * Provides backward-compatible exports.
 * 
 * @module llm-service
 */

// ==========================================
// Main Service (re-export for backward compatibility)
// ==========================================
export { LLMService, CB_STATE } from './LLMService.js';
export { LLMService as default } from './LLMService.js';

// ==========================================
// Providers
// ==========================================
export { BaseProvider, CB_STATE as ProviderCBState } from './providers/base-provider.js';
export { LocalProvider } from './providers/local-provider.js';
export { OpenAIProvider } from './providers/openai-provider.js';
export { AnthropicProvider } from './providers/anthropic-provider.js';

// ==========================================
// Handlers
// ==========================================
export { RequestHandler, ValidationResult } from './handlers/request-handler.js';
export { ResponseHandler, ProcessedResponse } from './handlers/response-handler.js';

// ==========================================
// Cache
// ==========================================
export { ResponseCache } from './cache/response-cache.js';

// ==========================================
// Convenience Functions (backward compatible)
// ==========================================

import { LLMService } from './LLMService.js';

/**
 * Analiza código usando el LLM (convenience function)
 * @param {string} prompt - Prompt para el LLM
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<object>}
 */
export async function analyzeWithLLM(prompt, options = {}) {
  const service = await LLMService.getInstance();
  return service.analyze(prompt, options);
}

/**
 * Verifica si el LLM está disponible (convenience function)
 * @returns {Promise<boolean>}
 */
export async function isLLMAvailable() {
  const service = await LLMService.getInstance();
  return service.isAvailable();
}

/**
 * Espera a que el LLM esté disponible (convenience function)
 * @param {number} timeoutMs
 * @returns {Promise<boolean>}
 */
export async function waitForLLM(timeoutMs = 60000) {
  const service = await LLMService.getInstance();
  return service.waitForAvailable(timeoutMs);
}
