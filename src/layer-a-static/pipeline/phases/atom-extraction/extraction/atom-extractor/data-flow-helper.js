/**
 * Data flow extraction helper with error handling
 * @module pipeline/phases/atom-extraction/extraction/atom-extractor/data-flow-helper
 */

import { extractDataFlow as extractDataFlowV2 } from '#layer-a/extractors/data-flow/index.js';
import { logger } from '#utils/logger.js';

/**
 * Extract data flow with error handling
 * @param {Object} functionInfo - Function info from parser
 * @param {string} functionCode - Extracted function source code
 * @param {string} filePath - File path
 * @returns {Promise<Object|null>} - Data flow analysis or null on failure
 */
export async function extractDataFlowSafe(functionInfo, functionCode, filePath) {
  try {
    const input = functionInfo.node || functionCode;

    if (input) {
      return await extractDataFlowV2(
        input,
        { functionName: functionInfo.name, filePath, inferTypes: true }
      );
    }
  } catch (error) {
    logger.warn(`Data flow extraction failed for ${functionInfo.name} in ${filePath}: ${error.message}`);
  }
  return null;
}
