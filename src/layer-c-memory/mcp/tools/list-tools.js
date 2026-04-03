import { createLogger } from '../../../utils/logger.js';
import {
  buildCompilerToolInventoryReport,
  buildCompilerToolInventorySnapshot
} from '../../../shared/compiler/index.js';

const logger = createLogger('OmnySys:mcp:list_tools');

export const buildInventorySnapshot = buildCompilerToolInventorySnapshot;
export const buildInventoryReport = buildCompilerToolInventoryReport;

export async function list_tools(args = {}) {
  try {
    const snapshot = buildCompilerToolInventorySnapshot(args);
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
    const snapshot = buildCompilerToolInventorySnapshot(args);
    return {
      success: true,
      ...snapshot,
      report: buildCompilerToolInventoryReport(snapshot)
    };
  } catch (error) {
    logger.error(`[Tool] get_tool_inventory_report failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

export default { list_tools, get_tool_inventory_report };
