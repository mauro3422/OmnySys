/**
 * @fileoverview LocalStorage Detector
 * 
 * Detects localStorage and sessionStorage operations in function code
 * 
 * @module function-analyzer/detectors/localStorage-detector
 */

/**
 * Detect localStorage/sessionStorage operations
 * @param {string} functionCode - Function code
 * @returns {Array} Storage operations
 */
/**
 * Helper to extract operations using a given regex pattern
 */
function extractOpsByPattern(code, pattern, type, seen, ops, customKeyIndex = 2, filterFn = null) {
  let match;
  while ((match = pattern.exec(code)) !== null) {
    const storage = match[1];
    const rawKey = match[customKeyIndex];
    if (filterFn && !filterFn(rawKey)) continue;

    const uniqueId = `${storage}-${rawKey}-${type}`;
    if (!seen.has(uniqueId)) {
      seen.add(uniqueId);
      ops.push({
        key: rawKey,
        type: type,
        storage: storage
      });
    }
  }
}

/**
 * Detect localStorage/sessionStorage operations
 * @param {string} functionCode - Function code
 * @returns {Array} Storage operations
 */
export function detectLocalStorageOps(functionCode) {
  const ops = [];
  const seen = new Set();

  // Define Patterns
  const patterns = {
    writeSetItem: /(localStorage|sessionStorage)\.setItem\s*\(\s*['"`](\w+)['"`]/g,
    writeBracket: /(localStorage|sessionStorage)\[['"`]?(\w+)['"`]?\]\s*=/g,
    writeProp: /(localStorage|sessionStorage)\.(\w+)\s*=\s*(?!function)/g,
    readGetItem: /(localStorage|sessionStorage)\.getItem\s*\(\s*['"`](\w+)['"`]/g,
    readBracket: /(localStorage|sessionStorage)\[['"`]?(\w+)['"`]?\](?!\s*=)/g,
    removeOp: /(localStorage|sessionStorage)\.removeItem\s*\(\s*['"`](\w+)['"`]/g
  };

  const BUILTIN_METHODS = ['setItem', 'getItem', 'removeItem', 'clear'];

  extractOpsByPattern(functionCode, patterns.writeSetItem, 'write', seen, ops);
  extractOpsByPattern(functionCode, patterns.writeBracket, 'write', seen, ops);
  extractOpsByPattern(functionCode, patterns.writeProp, 'write', seen, ops, 2, k => !BUILTIN_METHODS.includes(k));

  extractOpsByPattern(functionCode, patterns.readGetItem, 'read', seen, ops);
  extractOpsByPattern(functionCode, patterns.readBracket, 'read', seen, ops);

  extractOpsByPattern(functionCode, patterns.removeOp, 'remove', seen, ops);

  return ops;
}
