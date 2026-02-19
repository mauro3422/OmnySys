/**
 * @fileoverview index.js
 * 
 * Servicios de aplicación - Punto de entrada único.
 * 
 * Servicios disponibles:
 * - LLMService: Comunicación centralizada con servidor GPU
 * 
 * @module services
 */

export { LLMService } from './llm-service/index.js';
export { getSingletonInstance } from './llm-service/singleton/index.js';

// Convenience functions (use singleton LLMService instance)
import { getSingletonInstance as _getInstance } from './llm-service/singleton/index.js';

export async function analyzeWithLLM(prompt, options = {}) {
  const service = _getInstance();
  return service.analyze(prompt, options);
}

export function isLLMAvailable() {
  const service = _getInstance();
  return service.isAvailable();
}

export async function waitForLLM(timeoutMs = 60000) {
  const service = _getInstance();
  return service.waitForAvailable(timeoutMs);
}

// Re-export default
export { default } from './llm-service/index.js';
