/**
 * @fileoverview MCP Client Configuration
 *
 * Legacy wrapper retained for compatibility with older CLI code/tests.
 *
 * @module cli/utils/opencode-config
 */

import {
  standardizeMcpInstallation,
  getClientConfigPath,
  getUnifiedConfigPath
} from './mcp-client-standardizer.js';

/**
 * Setup MCP configuration for all supported clients + workspace defaults.
 * @returns {Promise<object>} Standardization result
 */
export async function setupMcpClients(options = {}) {
  return standardizeMcpInstallation(options);
}

/**
 * Legacy name kept for backward compatibility.
 * @returns {Promise<boolean>} Success
 */
export async function setupOpenCode(options = {}) {
  try {
    const result = await setupMcpClients(options);
    return result.success;
  } catch {
    return false;
  }
}

/**
 * Get OpenCode config path
 * @returns {string} Config path
 */
export function getOpenCodeConfigPath() {
  return getClientConfigPath('opencode');
}

/**
 * Get Codex config path
 * @returns {string} Config path
 */
export function getCodexConfigPath() {
  return getClientConfigPath('codex');
}

/**
 * Get unified local config file path.
 * @returns {string} Config path
 */
export function getUnifiedMcpConfigPath(projectPath = process.cwd()) {
  return getUnifiedConfigPath(projectPath);
}
