import { createLogger } from '../../../utils/logger.js';
import {
  buildCompilerToolInventoryReport,
  buildCompilerToolInventorySnapshot
} from '../../../shared/compiler/tool-inventory-summary.js';

const logger = createLogger('OmnySys:mcp:list_tools');

function buildInventorySnapshot(args = {}) {
  return buildCompilerToolInventorySnapshot(args);
}

function buildInventoryReport(snapshot) {
  return buildCompilerToolInventoryReport(snapshot);
}

export async function list_tools(args = {}) {
  try {
    const snapshot = buildInventorySnapshot(args);
    return {
      success: true,
      ...snapshot
    };
  } catch (error) {
    logger.error(`[Tool] list_tools failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

export async function get_tool_inventory_report(args = {}) {
  try {
    const snapshot = buildInventorySnapshot(args);
    return {
      success: true,
      ...snapshot,
      report: buildInventoryReport(snapshot)
    };
  } catch (error) {
    logger.error(`[Tool] get_tool_inventory_report failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

export { buildInventorySnapshot, buildInventoryReport };

export default { list_tools, get_tool_inventory_report };
