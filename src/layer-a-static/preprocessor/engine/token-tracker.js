/**
 * @fileoverview Token Tracker
 * Tracks significant tokens for future context
 * 
 * @module preprocessor/engine/token-tracker
 */

/**
 * Tracks a token for context
 * @param {Object} context - Context model
 * @param {string} char - Current character
 * @param {Object} lookahead - Lookahead object
 */
export function trackToken(context, char, lookahead) {
  // Operators
  if (char === '|' && lookahead.nextChar === '>') {
    context.pushToken('|>', 'operator');
  }
  
  // Brackets
  if ('{}[]()'.includes(char)) {
    context.pushToken(char, 'bracket');
  }
  
  // Basic keywords
  if (lookahead.prevChars?.endsWith('class ')) {
    context.pushToken('class', 'keyword');
  }
  
  // Punctuation
  if ('.;,'.includes(char)) {
    context.pushToken(char, 'punctuation');
  }
  
  // Identifiers (simplified)
  if (/[a-zA-Z_$]/.test(char)) {
    // Full identifier tracking could be added here
  }
}

/**
 * Gets recent tokens from context
 * @param {Object} context - Context model
 * @param {number} count - Number of tokens to get
 * @returns {Array}
 */
export function getRecentTokens(context, count = 5) {
  const tokens = context.getTokens ? context.getTokens() : [];
  return tokens.slice(-count);
}
