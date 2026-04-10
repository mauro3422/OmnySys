/**
 * @fileoverview Port Checker Utilities
 * 
 * @module cli/utils/port-checker
 */

import http from 'http';
import { buildHealthProbeUrls } from './mcp-endpoints.js';

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
  const urls = buildHealthProbeUrls({ port });

  for (const url of urls) {
    const result = await new Promise((resolve) => {
      try {
        const req = http.get(url, { timeout: 1000 }, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              if (res.statusCode === 200) {
                resolve(JSON.parse(data));
              } else {
                resolve(false);
              }
            } catch {
              resolve(res.statusCode === 200);
            }
          });
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
      } catch {
        resolve(false);
      }
    });

    if (result) {
      return result;
    }
  }

  return false;
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
