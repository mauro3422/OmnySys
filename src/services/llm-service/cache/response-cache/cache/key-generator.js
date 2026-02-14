/**
 * @fileoverview Cache Key Generator
 * 
 * Generates deterministic cache keys from requests.
 * 
 * @module llm-service/cache/response-cache/cache/key-generator
 */

/**
 * Generate cache key from request
 * @param {string} prompt - The prompt
 * @param {Object} options - Request options
 * @returns {string}
 */
export function generateKey(prompt, options = {}) {
  // Create a deterministic key based on prompt and relevant options
  const keyParts = [
    prompt,
    options.model || 'default',
    options.systemPrompt || '',
    options.temperature,
    options.maxTokens
  ];
  
  // Simple hash function
  const str = JSON.stringify(keyParts);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `cache_${hash.toString(36)}`;
}
