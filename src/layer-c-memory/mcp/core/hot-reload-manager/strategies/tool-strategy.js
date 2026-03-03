/**
 * @fileoverview Tool Reload Strategy
 *
 * When a tool file changes, this strategy logs a notice and does nothing else.
 *
 * WHY NO MODULE RELOAD:
 * Node.js ESM caches all imports permanently within a process. There is no
 * reliable way to reload a module mid-process without process restart.
 * `import(url + '?bust=...')` creates a new module instance, but parent
 * modules (tools/index.js, mcp-http-server.js) still hold references to
 * the old exported functions — so the "reload" is invisible.
 *
 * HOW TO APPLY CODE CHANGES:
 *   Restart the VS Code task "OmnySys MCP Daemon" (~8 seconds).
 *
 * FUTURE: A plugin system for user-defined tools (outside the main module graph)
 * could support true hot-loading via isolated dynamic imports.
 *
 * @module hot-reload-manager/strategies/tool-strategy
 */

import { BaseStrategy } from './base-strategy.js';

/**
 * Strategy for tool file changes
 *
 * @class ToolStrategy
 * @extends BaseStrategy
 */
export class ToolStrategy extends BaseStrategy {
  /**
   * Handles a tool file change — logs a notice, no module reload.
   *
   * @param {string} filename - Changed tool file
   * @returns {Promise<void>}
   */
  async reload(filename) {
    this._log('Tool changed — restart task to apply (8s)', filename);
  }
}

export default ToolStrategy;
