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

export { 
  LLMService,
  analyzeWithLLM,
  isLLMAvailable,
  waitForLLM
} from './llm-service.js';

// Re-export default
export { default } from './llm-service.js';
