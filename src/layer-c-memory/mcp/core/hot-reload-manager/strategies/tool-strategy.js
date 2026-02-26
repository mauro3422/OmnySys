/**
 * @fileoverview Tool Reload Strategy
 *
 * Handles hot-reload of MCP tools.
 * Uses ESM dynamic imports with cache busting.
 * After reloading the changed leaf file, also refreshes the full
 * tools/index.js chain via the mcp-http-server's mutable tool registry.
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
      // Step 1: Import the changed leaf file with cache busting
      await import(uniqueImport);
      this._log('Tool leaf-file reloaded', filename);

      // Step 2: Refresh the live tool registry so the full import chain
      // (changed file → parent tool → tools/index.js) is hot-swapped.
      // We dynamically import refreshToolRegistry to avoid a circular
      // static dependency between mcp-http-server and strategy files.
      try {
        const { refreshToolRegistry } = await import('../../../../../../mcp-http-server.js');
        await refreshToolRegistry();
      } catch (refreshErr) {
        // Non-fatal: the http-server module may not be the current runtime
        // (e.g. during unit tests or when using the stdio bridge).
        this._log('Tool registry refresh skipped (not running via http-server)', refreshErr.message);
      }

    } catch (error) {
      throw new Error(`Failed to reload tool ${filename}: ${error.message}`);
    }
  }
}

export default ToolStrategy;
