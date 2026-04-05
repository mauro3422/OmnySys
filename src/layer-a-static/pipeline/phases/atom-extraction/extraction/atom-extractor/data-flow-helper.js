/**
 * Data flow extraction helper with error handling
 * @module pipeline/phases/atom-extraction/extraction/atom-extractor/data-flow-helper
 */

import { extractDataFlow as extractDataFlowV2 } from '#layer-a/extractors/data-flow/index.js';
import { logger } from '#utils/logger.js';
import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';

// Cache parser to avoid creating 20k+ parser instances
let cachedParser = null;

function getParser() {
  if (!cachedParser) {
    cachedParser = new Parser();
    cachedParser.setLanguage(TypeScript.tsx);
  }
  return cachedParser;
}

/**
 * Parse code string into a Tree-sitter node for data flow extraction
 */
function parseCodeToNode(code) {
  try {
    const parser = getParser();
    const tree = parser.parse(code);
    if (tree.rootNode.hasError) return null;
    return tree.rootNode;
  } catch {
    return null;
  }
}

/**
 * Extract data flow with error handling
 * @param {Object} functionInfo - Function info from parser
 * @param {string} functionCode - Extracted function source code
 * @param {string} filePath - File path
 * @returns {Object|null} - Data flow analysis or null on failure
 */
export function extractDataFlowSafe(functionInfo, functionCode, filePath) {
  try {
    // Prefer the AST node from the parser; fallback to parsing the code ourselves
    let input = functionInfo.node;
    if (!input && functionCode) {
      input = parseCodeToNode(functionCode);
    }

    if (input) {
      return extractDataFlowV2(
        input,
        { functionName: functionInfo.name, filePath, code: functionCode, inferTypes: true }
      );
    }
  } catch (error) {
    logger.warn(`Data flow extraction failed for ${functionInfo.name} in ${filePath}: ${error.message}`);
  }
  return null;
}
