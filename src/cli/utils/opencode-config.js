/**
 * @fileoverview OpenCode Configuration
 * 
 * @module cli/utils/opencode-config
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { PORTS } from './port-checker.js';

const OPENCODE_DIR = path.join(os.homedir(), '.config', 'opencode');
const OPENCODE_CONFIG = path.join(OPENCODE_DIR, 'opencode.json');

/**
 * Setup OpenCode configuration
 * @returns {Promise<boolean>} Success
 */
export async function setupOpenCode() {
  try {
    await fs.mkdir(OPENCODE_DIR, { recursive: true });
    
    let config = {};
    try {
      const content = await fs.readFile(OPENCODE_CONFIG, 'utf-8');
      config = JSON.parse(content);
    } catch {
      // No existing config
    }
    
    if (!config.mcpServers) config.mcpServers = {};
    
    config.mcpServers.omnysys = {
      type: 'http',
      url: `http://localhost:${PORTS.mcp}`,
      description: 'OmnySys HTTP MCP Server'
    };
    
    await fs.writeFile(OPENCODE_CONFIG, JSON.stringify(config, null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get OpenCode config path
 * @returns {string} Config path
 */
export function getOpenCodeConfigPath() {
  return OPENCODE_CONFIG;
}
