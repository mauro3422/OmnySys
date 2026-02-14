/**
 * @fileoverview Pattern Detector - Detección de patrones arquitectónicos
 * 
 * @module comprehensive-extractor/patterns
 */

/**
 * Detect architectural patterns
 * 
 * @param {Object} results - Extraction results
 * @returns {Object} - Detected patterns
 */
export function detectPatterns(results) {
  const patterns = {
    architectural: [],
    structural: [],
    behavioral: []
  };
  
  // Detect singleton pattern
  if (detectSingleton(results)) {
    patterns.architectural.push('singleton');
  }
  
  // Detect factory pattern
  if (detectFactory(results)) {
    patterns.architectural.push('factory');
  }
  
  // Detect async patterns
  const asyncPatterns = detectAsyncPatterns(results);
  patterns.behavioral.push(...asyncPatterns);
  
  // Detect module patterns
  if (detectBarrelFile(results)) {
    patterns.structural.push('barrel');
  }
  
  // Detect React patterns (if applicable)
  if (detectReactUsage(results)) {
    patterns.architectural.push('react');
  }
  
  return patterns;
}

/**
 * Detect singleton pattern
 * @param {Object} results 
 * @returns {boolean}
 */
function detectSingleton(results) {
  if (!results.classes?.classes) return false;
  
  return results.classes.classes.some(c => 
    c.methods?.some(m => m.name === 'getInstance') ||
    (c.staticMembers > 0 && c.methods?.some(m => 
      m.name === 'constructor' && m.isPrivate
    ))
  );
}

/**
 * Detect factory pattern
 * @param {Object} results 
 * @returns {boolean}
 */
function detectFactory(results) {
  if (!results.functions?.functions) return false;
  
  return results.functions.functions.some(f => 
    f.name?.toLowerCase().includes('create') ||
    f.name?.toLowerCase().includes('factory')
  );
}

/**
 * Detect async patterns
 * @param {Object} results 
 * @returns {Array<string>}
 */
function detectAsyncPatterns(results) {
  const patterns = [];
  
  if (!results.asyncPatterns) return patterns;
  
  if (results.asyncPatterns.hasAsyncAwait) patterns.push('async-await');
  if (results.asyncPatterns.hasPromises) patterns.push('promises');
  if (results.asyncPatterns.promiseChains > 2) patterns.push('promise-chaining');
  
  return patterns;
}

/**
 * Detect barrel file pattern
 * @param {Object} results 
 * @returns {boolean}
 */
function detectBarrelFile(results) {
  return results.exports?.patterns?.isBarrelFile === true;
}

/**
 * Detect React usage
 * @param {Object} results 
 * @returns {boolean}
 */
function detectReactUsage(results) {
  if (!results.imports?.all) return false;
  
  return results.imports.all.some(i => 
    i.source?.includes('react') || 
    i.source?.includes('jsx')
  );
}

/**
 * Detect design patterns by name
 * @param {string} code - Source code
 * @returns {Array<string>} Detected pattern names
 */
export function detectPatternsByName(code) {
  const patterns = [];
  
  // Observer pattern
  if (/\bon\(|addEventListener|removeEventListener/.test(code)) {
    patterns.push('observer');
  }
  
  // Strategy pattern
  if (/strategy|Strategy/.test(code)) {
    patterns.push('strategy');
  }
  
  // Decorator pattern
  if (/@\w+|decorator|Decorator/.test(code)) {
    patterns.push('decorator');
  }
  
  return patterns;
}
