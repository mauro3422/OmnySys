/**
 * @fileoverview llm-service.js
 * 
 * Servicio centralizado para comunicación con LLM (servidor GPU/CPU).
 * 
 * ⚠️  DEPRECATED: This file is kept for backward compatibility.
 * Please import from 'llm-service/' module instead:
 * 
 *   import { LLMService, analyzeWithLLM } from './llm-service/index.js';
 * 
 * Or use the specific modules:
 * 
 *   import { LLMService } from './llm-service/LLMService.js';
 *   import { OpenAIProvider } from './llm-service/providers/openai-provider.js';
 * 
 * @deprecated Use llm-service/ module instead
 * @module services/llm-service
 */

// Re-export everything from the modular implementation
export {
  // Main service
  LLMService,
  CB_STATE,
  
  // Providers
  BaseProvider,
  LocalProvider,
  OpenAIProvider,
  AnthropicProvider,
  ProviderCBState,
  
  // Handlers
  RequestHandler,
  ValidationResult,
  ResponseHandler,
  ProcessedResponse,
  
  // Cache
  ResponseCache,
  
  // Convenience functions
  analyzeWithLLM,
  isLLMAvailable,
  waitForLLM
} from './llm-service/index.js';

// Default export
export { LLMService as default } from './llm-service/index.js';
