#!/usr/bin/env node
import http from 'http';
import { isPortAcceptingConnections } from '../shared/utils/port-probe.js';

export async function detectHealthyDaemon(port = 9999) {
  return await new Promise((resolve) => {
    try {
      const req = http.get(`http://127.0.0.1:${port}/health`, { timeout: 1500 }, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            resolve(json?.status === 'healthy' && json?.service === 'omnysys-mcp-http');
          } catch {
            resolve(false);
          }
        });
      });

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

export async function waitForPortRelease(portToCheck, attempts = 10, delayMs = 750) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (!(await isPortAcceptingConnections(portToCheck))) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}
