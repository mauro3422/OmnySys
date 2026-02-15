/**
 * @fileoverview Atom Utilities
 * 
 * Helper functions for finding and working with atoms.
 * Centralizes atom lookup logic for SSOT.
 * 
 * @module race-detector/utils/atom-utils
 * @version 1.0.0
 */

/**
 * Find atom by its ID
 * @param {string} atomId - Atom ID in format "filePath::functionName"
 * @param {Object} project - Project data with modules/atoms
 * @returns {Object|null} - Atom object or null if not found
 */
export function findAtomById(atomId, project) {
  if (!atomId || !project) return null;
  
  const parts = atomId.split('::');
  const filePath = parts.length > 1 ? parts[0] : null;
  const functionName = parts.length > 1 ? parts[1] : null;
  
  for (const module of project.modules || []) {
    for (const molecule of module.files || []) {
      // If we have a file path, check if molecule matches
      const fileMatches = !filePath || molecule.filePath?.endsWith(filePath);
      
      if (!filePath || fileMatches) {
        for (const atom of molecule.atoms || []) {
          // Match by exact ID, or by function name if we have one
          if (atom.id === atomId || 
              (functionName && atom.name === functionName) ||
              (!functionName && atom.id === atomId)) {
            return atom;
          }
        }
      }
    }
  }
  
  return null;
}

/**
 * Extract queue name from code
 * @param {string} code - Source code to analyze
 * @returns {string|null} - Queue name or null if not found
 */
export function extractQueueName(code) {
  const patterns = [
    /queue\s*[=:]\s*(\w+)/i,
    /new\s+\w*Queue\s*\(\s*['"](\w+)['"]/i,
    /queue\(["'](\w+)["']\)/i
  ];
  
  for (const pattern of patterns) {
    const match = code.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Check if a variable is shared state
 * @param {string} name - Variable name
 * @returns {boolean} - True if it matches shared state patterns
 */
export function isSharedStateVariable(name) {
  const sharedPatterns = [
    /^window\./i,
    /^global\./i,
    /^localStorage/i,
    /^sessionStorage/i,
    /^document\./i,
    /^process\./i,
    /^shared/i,
    /^cache/i,
    /^state/i
  ];
  
  return sharedPatterns.some(p => p.test(name));
}

/**
 * Check if a name is a JavaScript keyword
 * @param {string} name - Name to check
 * @returns {boolean} - True if it's a keyword
 */
export function isJavaScriptKeyword(name) {
  const keywords = [
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
    'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally',
    'throw', 'new', 'this', 'true', 'false', 'null', 'undefined', 'typeof',
    'instanceof', 'in', 'of', 'async', 'await', 'class', 'extends', 'super',
    'import', 'export', 'default', 'from', 'as', 'with', 'yield'
  ];
  return keywords.includes(name);
}
