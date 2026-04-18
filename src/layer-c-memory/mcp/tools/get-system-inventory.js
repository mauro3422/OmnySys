/**
 * Tool: mcp_omnysystem_get_system_inventory_report
 *
 * Returns the canonical system inventory for emergent APIs, canonical
 * surfaces, bridges and wrappers, along with the compact report used by
 * status/health consumers.
 */

import { createLogger } from '../../../utils/logger.js';
import {
  buildCompilerSystemInventoryToolResponse
} from '../../../shared/compiler/index.js';

const logger = createLogger('OmnySys:system-inventory');
export async function get_system_inventory_report(args, context) {
  logger.info('[Tool] get_system_inventory_report()');

  try {
    return await buildCompilerSystemInventoryToolResponse(args, context);
  } catch (error) {
    logger.error(`[Tool] get_system_inventory_report failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

export default { get_system_inventory_report };
