/**
 * @fileoverview CSS-in-JS Extractor - Main Entry Point
 * 
 * Extracts information from CSS-in-JS libraries (styled-components, emotion)
 * 
 * @module css-in-js-extractor
 */

import { parseStyledTags, parseStyledStrings, parseStyledComponents, parseCSSProps } from './parsers/styled-parser.js';
import { parseThemeProviders, parseUseTheme, parseWithTheme, parseThemeAccess } from './parsers/theme-parser.js';
import { parseGlobalStyles } from './parsers/global-style-parser.js';
import { detectThemeConnections } from './detectors/theme-connections.js';
import { detectStyledComponentConnections } from './detectors/styled-connections.js';

/**
 * Extract styled components from code
 * @param {string} code - Source code
 * @returns {Object} Extracted data
 */
export function extractStyledComponents(code) {
  const components = [
    ...parseStyledTags(code),
    ...parseStyledStrings(code),
    ...parseStyledComponents(code),
    ...parseCSSProps(code)
  ];

  const themes = [
    ...parseThemeProviders(code),
    ...parseUseTheme(code),
    ...parseWithTheme(code),
    ...parseThemeAccess(code)
  ];

  const globalStyles = parseGlobalStyles(code);

  return {
    components,
    themes,
    globalStyles,
    all: [...components, ...themes, ...globalStyles]
  };
}

/**
 * Extract all CSS-in-JS data from a file
 * @param {string} filePath - File path
 * @param {string} code - Source code
 * @returns {Object} Complete analysis
 */
export function extractCSSInJSFromFile(filePath, code) {
  return {
    filePath,
    ...extractStyledComponents(code),
    timestamp: new Date().toISOString()
  };
}

/**
 * Detect all CSS-in-JS connections
 * @param {Object} fileSourceCode - Map of filePath -> code
 * @returns {Object} Detected connections
 */
export function detectAllCSSInJSConnections(fileSourceCode) {
  const fileResults = {};

  for (const [filePath, code] of Object.entries(fileSourceCode)) {
    fileResults[filePath] = extractCSSInJSFromFile(filePath, code);
  }

  const themeConnections = detectThemeConnections(fileResults);
  const styledConnections = detectStyledComponentConnections(fileResults);

  return {
    connections: [...themeConnections, ...styledConnections],
    fileResults,
    byType: {
      theme: themeConnections,
      styledExtension: styledConnections
    }
  };
}

// Re-export all
export { detectThemeConnections, detectStyledComponentConnections };
export * from './parsers/styled-parser.js';
export * from './parsers/theme-parser.js';
export * from './parsers/global-style-parser.js';

// Default export
export default {
  extractStyledComponents,
  extractCSSInJSFromFile,
  detectAllCSSInJSConnections,
  detectThemeConnections,
  detectStyledComponentConnections
};
