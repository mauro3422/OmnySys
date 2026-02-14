/**
 * @fileoverview Global Access Detector
 * 
 * Detects global variable access in function code
 * 
 * @module function-analyzer/detectors/global-access-detector
 */

/**
 * Detect global variable access
 * @param {string} functionCode - Function code
 * @returns {Array} Global accesses
 */
export function detectGlobalAccess(functionCode) {
  const globals = [];
  
  // window.x, global.x, self.x
  const patterns = [
    { regex: /\bwindow\.(\w+)/g, type: 'window' },
    { regex: /\bglobal\.(\w+)/g, type: 'global' },
    { regex: /\bself\.(\w+)/g, type: 'self' },
    { regex: /\bdocument\.(\w+)/g, type: 'document' },
    { regex: /\bnavigator\.(\w+)/g, type: 'navigator' },
    { regex: /\blocation\.(\w+)/g, type: 'location' }
  ];
  
  for (const { regex, type } of patterns) {
    let match;
    while ((match = regex.exec(functionCode)) !== null) {
      globals.push({
        type,
        property: match[1],
        line: getLineNumber(functionCode, match.index)
      });
    }
  }
  
  return globals;
}

/**
 * Get line number
 */
function getLineNumber(code, position) {
  return code.substring(0, position).split('\n').length;
}
