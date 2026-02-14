/**
 * @fileoverview Global Style Parser
 * 
 * Parse global styles patterns
 * 
 * @module css-in-js-extractor/parsers/global-style-parser
 */

/**
 * Parse createGlobalStyle
 * @param {string} code - Source code
 * @returns {Array} Parsed global styles
 */
export function parseGlobalStyles(code) {
  const globalStyles = [];
  const pattern = /createGlobalStyle\s*`([^`]+)`/g;
  let match;

  while ((match = pattern.exec(code)) !== null) {
    globalStyles.push({
      type: 'global_style',
      css: match[1].slice(0, 200),
      line: getLineNumber(code, match.index)
    });
  }

  return globalStyles;
}

/**
 * Get line number from position
 */
function getLineNumber(code, position) {
  const lines = code.substring(0, position).split('\n');
  return lines.length;
}
