/**
 * @fileoverview Port Checker Utilities
 * 
 * @module cli/utils/port-checker
 */

import http from 'http';

export const PORTS = {
  llm: 8000,
  mcp: 9999
};

/**
 * Check if a port is responding
 * @param {number} port - Port to check
 * @returns {Promise<boolean>} Whether port is active
 */
export async function checkPort(port) {
  return new Promise((resolve) => {
    try {
      const req = http.get(`http://localhost:${port}/health`, { timeout: 1000 }, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
    } catch (error) {
      resolve(false);
    }
  });
}

/**
 * Check if LLM server is running
 * @returns {Promise<boolean>}
 */
export async function checkLLM() {
  return checkPort(PORTS.llm);
}

/**
 * Check if MCP server is running
 * @returns {Promise<boolean>}
 */
export async function checkMCP() {
  return checkPort(PORTS.mcp);
}
