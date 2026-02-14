/**
 * @fileoverview LLM Service Module
 * 
 * @module llm-service
 * 
 * @version 0.9.4 - Modularizado: separado en componentes especializados
 * @since 0.7.0
 */

// === Core ===
export { 
  LLMService,
  CB_STATE
} from './LLMService.js';

// === Providers ===
export {
  LocalProvider,
  OpenAIProvider,
  AnthropicProvider,
  BaseProvider
} from './providers/index.js';

// === Handlers ===
export {
  RequestHandler,
  ResponseHandler
} from './handlers/index.js';

// === Cache ===
export { ResponseCache } from './cache/response-cache.js';

// === Health ===
export { HealthChecker } from './health/index.js';

// === Metrics ===
export { MetricsTracker } from './metrics/index.js';

// === Batch ===
export { 
  processBatch,
  chunkArray,
  calculateOptimalChunkSize
} from './batch/index.js';

// === Singleton ===
export {
  getSingletonInstance,
  resetSingleton,
  hasInstance,
  getCurrentInstance
} from './singleton/index.js';

// === Default Export ===
export { LLMService as default } from './LLMService.js';
