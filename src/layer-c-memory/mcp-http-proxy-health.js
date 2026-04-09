#!/usr/bin/env node
import http from 'http';
import { isPortAcceptingConnections } from '../shared/utils/port-probe.js';

/**
 * Detecta si hay un daemon OmnySys respondiendo en el puerto especificado
 * y valida que sea del mismo proyecto para evitar duplicados.
 *
 * `healthy` significa listo para servir herramientas.
 * `alive` significa que el daemon existe y pertenece a OmnySys, aunque siga arrancando.
 *
 * @param {number} port - Puerto a verificar
 * @param {string} expectedProjectPath - Ruta del proyecto esperada (opcional)
 * @param {number} maxResponseTimeMs - Tiempo maximo aceptable de respuesta
 * @returns {Promise<{healthy: boolean, alive?: boolean, responseTimeMs?: number, processInfo?: {pid: number, projectPath: string, processType: string}, state?: string}>}
 */
export async function detectHealthyDaemon(port = 9999, expectedProjectPath = null, maxResponseTimeMs = 3000) {
  const startTime = Date.now();

  return await new Promise((resolve) => {
    try {
      const req = http.get(`http://127.0.0.1:${port}/health`, { timeout: maxResponseTimeMs }, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          const responseTimeMs = Date.now() - startTime;

          try {
            const json = JSON.parse(body);
            const state = String(json?.status || '').toLowerCase();
            const isKnownDaemon = json?.service === 'omnysys-mcp-http';
            const isAlive = isKnownDaemon && ['healthy', 'starting', 'degraded'].includes(state);
            const isHealthy = isKnownDaemon && state === 'healthy';

            if (!isAlive) {
              resolve({ healthy: false, alive: false, responseTimeMs, state });
              return;
            }

            if (responseTimeMs > maxResponseTimeMs) {
              resolve({
                healthy: false,
                alive: true,
                isFrozen: true,
                responseTimeMs,
                state,
                message: `Daemon responded too slowly (${responseTimeMs}ms > ${maxResponseTimeMs}ms threshold)`
              });
              return;
            }

            const processInfo = {
              pid: json.pid || null,
              projectPath: json.projectPath || null,
              processType: json.processType || 'daemon'
            };

            if (!expectedProjectPath) {
              resolve({ healthy: isHealthy, alive: true, responseTimeMs, processInfo, state });
              return;
            }

            const normalizedExpected = expectedProjectPath.replace(/\\/g, '/');
            const normalizedActual = (json.projectPath || '').replace(/\\/g, '/');

            if (normalizedActual && normalizedActual !== normalizedExpected) {
              resolve({
                healthy: false,
                alive: true,
                isDifferentProject: true,
                responseTimeMs,
                state,
                processInfo
              });
              return;
            }

            resolve({ healthy: isHealthy, alive: true, responseTimeMs, processInfo, state });
          } catch {
            resolve({ healthy: false, alive: false, responseTimeMs });
          }
        });
      });

      req.on('error', () => resolve({ healthy: false, alive: false, responseTimeMs: Date.now() - startTime }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ healthy: false, alive: false, responseTimeMs: Date.now() - startTime, isTimeout: true });
      });
    } catch {
      resolve({ healthy: false, alive: false, responseTimeMs: Date.now() - startTime });
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
