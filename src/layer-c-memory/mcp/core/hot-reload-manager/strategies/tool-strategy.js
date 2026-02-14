/**
 * @fileoverview Tool Reload Strategy
 * 
 * Handles hot-reload of MCP tools.
 * Uses ESM dynamic imports with cache busting.
 * 
 * @module hot-reload-manager/strategies/tool-strategy
 */

import { BaseStrategy } from './base-strategy.js';

/**
 * Strategy for reloading tools
 * 
 * @class ToolStrategy
 * @extends BaseStrategy
 */
export class ToolStrategy extends BaseStrategy {
  /**
   * Reloads a tool module
   * 
   * @param {string} filename - Tool file to reload
   * @returns {Promise<void>}
   */
  async reload(filename) {
    const toolPath = this._resolvePath(filename);
    const uniqueImport = this._generateUniqueImport(toolPath, 'hot-reload');

    try {
      // Import new module with cache busting
      const newModule = await import(uniqueImport);

      this._log('Tool reloaded', filename);

      // Note: Tools are registered in McpSetupStep,
      // next call will use new code automatically

      return newModule;
    } catch (error) {
      throw new Error(`Failed to reload tool ${filename}: ${error.message}`);
    }
  }
}

export default ToolStrategy;
