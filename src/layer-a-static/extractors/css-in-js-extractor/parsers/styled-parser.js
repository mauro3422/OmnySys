/**
 * @fileoverview Styled Parser
 * 
 * Parse styled-components patterns
 * 
 * @module css-in-js-extractor/parsers/styled-parser
 */

/**
 * Parse styled tag pattern: styled.div`...`
 * @param {string} code - Source code
 * @returns {Array} Parsed components
 */
export function parseStyledTags(code) {
  const components = [];
  const pattern = /styled\s*\.\s*(\w+)\s*`([^`]+)`/g;
  let match;

  while ((match = pattern.exec(code)) !== null) {
    const cssContent = match[2];
    const interpolations = extractInterpolations(cssContent);

    components.push({
      type: 'styled_tag',
      tag: match[1],
      css: cssContent.slice(0, 200),
      interpolations,
      line: getLineNumber(code, match.index),
      hasThemeAccess: interpolations.some(i => i.includes('theme'))
    });
  }

  return components;
}

/**
 * Parse styled string pattern: styled('div')`...`
 * @param {string} code - Source code
 * @returns {Array} Parsed components
 */
export function parseStyledStrings(code) {
  const components = [];
  const pattern = /styled\s*\(\s*['"](\w+)['"]\s*\)\s*`([^`]+)`/g;
  let match;

  while ((match = pattern.exec(code)) !== null) {
    components.push({
      type: 'styled_string',
      tag: match[1],
      css: match[2].slice(0, 200),
      line: getLineNumber(code, match.index)
    });
  }

  return components;
}

/**
 * Parse styled component pattern: styled(Component)`...`
 * @param {string} code - Source code
 * @returns {Array} Parsed components
 */
export function parseStyledComponents(code) {
  const components = [];
  const pattern = /styled\s*\(\s*(\w+)\s*\)\s*`([^`]+)`/g;
  let match;

  while ((match = pattern.exec(code)) !== null) {
    components.push({
      type: 'styled_component',
      baseComponent: match[1],
      css: match[2].slice(0, 200),
      line: getLineNumber(code, match.index)
    });
  }

  return components;
}

/**
 * Parse CSS prop (emotion): css={`...`}
 * @param {string} code - Source code
 * @returns {Array} Parsed CSS props
 */
export function parseCSSProps(code) {
  const components = [];
  const pattern = /css\s*=\s*\{?\s*`([^`]+)`/g;
  let match;

  while ((match = pattern.exec(code)) !== null) {
    components.push({
      type: 'css_prop',
      css: match[1].slice(0, 200),
      line: getLineNumber(code, match.index)
    });
  }

  return components;
}

/**
 * Extract interpolations from CSS
 */
function extractInterpolations(css) {
  const interpolations = [];
  const pattern = /\$\{\s*(?:\([^)]*\)\s*=>\s*)?([^}]+)\}/g;
  let match;

  while ((match = pattern.exec(css)) !== null) {
    interpolations.push(match[1]);
  }

  return interpolations;
}

/**
 * Get line number from position
 */
function getLineNumber(code, position) {
  const lines = code.substring(0, position).split('\n');
  return lines.length;
}
