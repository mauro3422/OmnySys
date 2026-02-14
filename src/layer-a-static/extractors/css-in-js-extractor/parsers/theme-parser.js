/**
 * @fileoverview Theme Parser
 * 
 * Parse theme-related patterns
 * 
 * @module css-in-js-extractor/parsers/theme-parser
 */

/**
 * Parse ThemeProvider
 * @param {string} code - Source code
 * @returns {Array} Parsed themes
 */
export function parseThemeProviders(code) {
  const themes = [];
  const pattern = /<ThemeProvider\s+theme\s*=\s*\{([^}]+)\}/g;
  let match;

  while ((match = pattern.exec(code)) !== null) {
    themes.push({
      type: 'theme_provider',
      themeVar: match[1],
      line: getLineNumber(code, match.index)
    });
  }

  return themes;
}

/**
 * Parse useTheme hook
 * @param {string} code - Source code
 * @returns {Array} Parsed themes
 */
export function parseUseTheme(code) {
  const themes = [];
  const pattern = /useTheme\s*\(\s*\)/g;
  let match;

  while ((match = pattern.exec(code)) !== null) {
    themes.push({
      type: 'use_theme',
      line: getLineNumber(code, match.index)
    });
  }

  return themes;
}

/**
 * Parse withTheme HOC
 * @param {string} code - Source code
 * @returns {Array} Parsed themes
 */
export function parseWithTheme(code) {
  const themes = [];
  const pattern = /withTheme\s*\(\s*(\w+)\s*\)/g;
  let match;

  while ((match = pattern.exec(code)) !== null) {
    themes.push({
      type: 'with_theme',
      component: match[1],
      line: getLineNumber(code, match.index)
    });
  }

  return themes;
}

/**
 * Parse theme access: theme.colors.primary
 * @param {string} code - Source code
 * @returns {Array} Parsed themes
 */
export function parseThemeAccess(code) {
  const themes = [];
  const pattern = /(?:theme|props\.theme)\.(\w+(?:\.\w+)*)/g;
  let match;

  while ((match = pattern.exec(code)) !== null) {
    themes.push({
      type: 'theme_access',
      path: match[1],
      line: getLineNumber(code, match.index)
    });
  }

  return themes;
}

/**
 * Get line number from position
 */
function getLineNumber(code, position) {
  const lines = code.substring(0, position).split('\n');
  return lines.length;
}
