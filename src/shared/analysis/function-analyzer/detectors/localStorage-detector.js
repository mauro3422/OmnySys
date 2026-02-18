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
export function detectLocalStorageOps(functionCode) {
  const ops = [];
  const seen = new Set();
  
  // localStorage.setItem('key', value)
  const setItemPattern = /(localStorage|sessionStorage)\.setItem\s*\(\s*['"`](\w+)['"`]/g;
  let match;
  while ((match = setItemPattern.exec(functionCode)) !== null) {
    const key = `${match[1]}-${match[2]}-write`;
    if (!seen.has(key)) {
      seen.add(key);
      ops.push({
        key: match[2],
        type: 'write',
        storage: match[1]
      });
    }
  }
  
  // localStorage['key'] = value or localStorage.key = value
  const bracketAssignPattern = /(localStorage|sessionStorage)\[['"`]?(\w+)['"`]?\]\s*=/g;
  while ((match = bracketAssignPattern.exec(functionCode)) !== null) {
    const key = `${match[1]}-${match[2]}-write`;
    if (!seen.has(key)) {
      seen.add(key);
      ops.push({
        key: match[2],
        type: 'write',
        storage: match[1]
      });
    }
  }
  
  // localStorage.key = value (property assignment)
  const propAssignPattern = /(localStorage|sessionStorage)\.(\w+)\s*=\s*(?!function)/g;
  while ((match = propAssignPattern.exec(functionCode)) !== null) {
    // Skip method names that are built-in
    const methods = ['setItem', 'getItem', 'removeItem', 'clear'];
    if (methods.includes(match[2])) continue;
    
    const key = `${match[1]}-${match[2]}-write`;
    if (!seen.has(key)) {
      seen.add(key);
      ops.push({
        key: match[2],
        type: 'write',
        storage: match[1]
      });
    }
  }
  
  // localStorage.getItem('key')
  const getItemPattern = /(localStorage|sessionStorage)\.getItem\s*\(\s*['"`](\w+)['"`]/g;
  while ((match = getItemPattern.exec(functionCode)) !== null) {
    const key = `${match[1]}-${match[2]}-read`;
    if (!seen.has(key)) {
      seen.add(key);
      ops.push({
        key: match[2],
        type: 'read',
        storage: match[1]
      });
    }
  }
  
  // localStorage['key'] or localStorage.key (read access)
  const bracketReadPattern = /(localStorage|sessionStorage)\[['"`]?(\w+)['"`]?\](?!\s*=)/g;
  while ((match = bracketReadPattern.exec(functionCode)) !== null) {
    const key = `${match[1]}-${match[2]}-read`;
    if (!seen.has(key)) {
      seen.add(key);
      ops.push({
        key: match[2],
        type: 'read',
        storage: match[1]
      });
    }
  }
  
  // localStorage.removeItem('key')
  const removePattern = /(localStorage|sessionStorage)\.removeItem\s*\(\s*['"`](\w+)['"`]/g;
  while ((match = removePattern.exec(functionCode)) !== null) {
    const key = `${match[1]}-${match[2]}-remove`;
    if (!seen.has(key)) {
      seen.add(key);
      ops.push({
        key: match[2],
        type: 'remove',
        storage: match[1]
      });
    }
  }
  
  return ops;
}
