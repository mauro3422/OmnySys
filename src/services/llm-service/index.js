/**
 * @fileoverview index.js
 *
 * Public API for the LLM Service module.
 * Provides LLMService class and CB_STATE constants.
 *
 * @module llm-service
 * @version 0.9.4
 * @since 0.7.0
 */

export { LLMService } from './service/LLMService.js';
export { CB_STATE } from './constants.js';

import { LLMService } from './service/LLMService.js';
export default LLMService;
