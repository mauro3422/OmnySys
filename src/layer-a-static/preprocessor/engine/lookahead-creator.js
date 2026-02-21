/**
 * @fileoverview Lookahead Creator
 * Creates lookahead objects for token analysis
 * 
 * @module preprocessor/engine/lookahead-creator
 */

/**
 * Creates lookahead object for a position
 * @param {string} code - Source code
 * @param {number} position - Current position
 * @param {string} prevChars - Previous characters buffer
 * @returns {Object} Lookahead object
 */
export function createLookahead(code, position, prevChars) {
  const nextChar = code[position + 1];
  const nextChars = code.slice(position + 1, position + 10);
  const prevChar = prevChars[prevChars.length - 1];
  
  // Detect next identifier
  const identifierMatch = code.slice(position + 1).match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
  const nextIdentifier = identifierMatch ? identifierMatch[0] : null;
  
  return {
    nextChar,
    nextChars,
    prevChar,
    prevChars,
    nextIdentifier,
    // Additional helpers
    isEndOfLine: nextChar === '\n' || nextChar === '\r',
    isWhitespace: /\s/.test(nextChar),
    isIdentifierStart: /[a-zA-Z_$]/.test(nextChar),
    isDigit: /[0-9]/.test(nextChar)
  };
}

/**
 * Creates initial lookahead buffer
 * @param {string} code - Source code
 * @returns {Object} Initial lookahead
 */
export function createInitialLookahead(code) {
  return createLookahead(code, -1, '');
}
