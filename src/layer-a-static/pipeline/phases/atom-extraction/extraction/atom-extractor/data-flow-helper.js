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
    // PRIORITY 1: Use the AST node from the original parser (most accurate)
    let input = functionInfo.node;
    if (input) {
      const result = extractDataFlowV2(
        input,
        { functionName: functionInfo.name, filePath, code: functionCode, inferTypes: true }
      );
      if (result && !result.error) return result;
    }

    // PRIORITY 2: Try parsing the function code with Tree-sitter
    // extractDataFlowV2 already does this internally when given a string,
    // so we just pass the code string and let it handle the parsing
    if (functionCode && functionCode.trim().length > 0) {
      const result = extractDataFlowV2(
        functionCode,
        { functionName: functionInfo.name, filePath, code: functionCode, inferTypes: true }
      );
      // Return result even if it has parseWarning — empty dataFlow is better than null
      // (DNA extraction needs some structure to work with)
      if (result && !result.error) return result;
      // If it has a parseWarning but still produced results, return it
      if (result && result.inputs) return result;
    }
  } catch (error) {
    logger.warn(`Data flow extraction failed for ${functionInfo.name} in ${filePath}: ${error.message}`);
  }
  return null;
}
