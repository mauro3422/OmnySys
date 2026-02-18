/**
 * @fileoverview llm-service.js
 *
 * Backward compatibility wrapper for the LLM Service module.
 *
 * ⚠️  DEPRECATED: This file is kept for backward compatibility only.
 * Import directly from the modular structure:
 *
 *   import { LLMService } from './llm-service/index.js';
 *   import { BaseProvider } from './llm-service/providers/index.js';
 *
 * @deprecated Use llm-service/ module instead
 * @module services/llm-service
 */

// ─── Core Service ────────────────────────────────────────────────────────────
export { LLMService, LLMService as default } from './llm-service/index.js';
export { CB_STATE } from './llm-service/index.js';

// ─── Providers ───────────────────────────────────────────────────────────────
export {
  BaseProvider,
  LocalProvider,
  OpenAIProvider,
  AnthropicProvider
} from './llm-service/providers/index.js';

// ─── Handlers ────────────────────────────────────────────────────────────────
export {
  RequestHandler,
  ValidationResult,
  ResponseHandler,
  ProcessedResponse
} from './llm-service/handlers/index.js';

// ─── Cache ────────────────────────────────────────────────────────────────────
export { ResponseCache } from './llm-service/cache/response-cache.js';

// ─── Convenience stubs (removed in refactor, kept for compat) ────────────────

/**
 * @deprecated Use `new LLMService().analyze()` instead
 * Convenience wrapper for one-shot LLM analysis.
 */
export async function analyzeWithLLM(prompt, options = {}) {
  const { LLMService } = await import('./llm-service/index.js');
  const service = new LLMService(options);
  return service.analyze(prompt, options);
}

/**
 * @deprecated Use `new LLMService().healthCheck()` instead
 * Checks if the LLM service is reachable and healthy.
 */
export async function isLLMAvailable(options = {}) {
  try {
    const { LLMService } = await import('./llm-service/index.js');
    const service = new LLMService(options);
    const health = await service.healthCheck();
    return health?.status === 'healthy' || health?.available === true;
  } catch {
    return false;
  }
}

/**
 * @deprecated Polling is now managed internally by LLMService.
 * Waits until the LLM becomes available or timeout expires.
 */
export async function waitForLLM(timeoutMs = 30000, intervalMs = 2000, options = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isLLMAvailable(options)) return true;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return false;
}

/**
 * @deprecated Use CB_STATE from llm-service/index.js instead.
 * Alias kept for compat.
 */
export { CB_STATE as ProviderCBState } from './llm-service/index.js';
