#!/usr/bin/env node
import http from 'http';
import { isPortAcceptingConnections } from '../shared/utils/port-probe.js';

/**
 * Detecta si hay un daemon saludable corriendo en el puerto especificado
 * y valida que sea del mismo proyecto para evitar duplicados.
 *
 * @param {number} port - Puerto a verificar
 * @param {string} expectedProjectPath - Ruta del proyecto esperada (opcional)
 * @param {number} maxResponseTimeMs - Tiempo máximo aceptable de respuesta (default 3000ms)
 * @returns {Promise<{healthy: boolean, responseTimeMs?: number, processInfo?: {pid: number, projectPath: string, processType: string}}>}
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
            const isHealthy = json?.status === 'healthy' && json?.service === 'omnysys-mcp-http';

            // Si no es healthy, retornar false
            if (!isHealthy) {
              resolve({ healthy: false, responseTimeMs });
              return;
            }
            
            // CRITICAL: Check if daemon is responding too slowly (frozen state)
            if (responseTimeMs > maxResponseTimeMs) {
              resolve({
                healthy: false,
                isFrozen: true,
                responseTimeMs,
                message: `Daemon responded too slowly (${responseTimeMs}ms > ${maxResponseTimeMs}ms threshold)`
              });
              return;
            }

            // Si se proporcionó una ruta de proyecto esperada, verificar coincidencia
            const processInfo = {
              pid: json.pid || null,
              projectPath: json.projectPath || null,
              processType: json.processType || 'daemon'
            };

            // Si no se espera un proyecto específico, solo verificar que es healthy
            if (!expectedProjectPath) {
              resolve({ healthy: true, responseTimeMs, processInfo });
              return;
            }

            // Verificar si es del mismo proyecto
            const normalizedExpected = expectedProjectPath.replace(/\\/g, '/');
            const normalizedActual = (json.projectPath || '').replace(/\\/g, '/');

            if (normalizedActual && normalizedActual !== normalizedExpected) {
              // Daemon existe pero es de otro proyecto
              resolve({
                healthy: false,
                isDifferentProject: true,
                responseTimeMs,
                processInfo
              });
              return;
            }

            resolve({ healthy: true, responseTimeMs, processInfo });
          } catch {
            resolve({ healthy: false, responseTimeMs });
          }
        });
      });

      req.on('error', () => resolve({ healthy: false, responseTimeMs: Date.now() - startTime }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ healthy: false, responseTimeMs: Date.now() - startTime, isTimeout: true });
      });
    } catch {
      resolve({ healthy: false, responseTimeMs: Date.now() - startTime });
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
