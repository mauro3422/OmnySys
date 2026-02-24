/**
 * @fileoverview logger.js
 * 
 * Event logging functionality
 * 
 * @module core/tunnel-vision-logger/events/logger
 */

import fs from 'fs/promises';
import { createLogger } from '../../../utils/logger.js';
import { generateSessionId } from '../utils/session.js';
import { TUNNEL_VISION_LOG } from '../storage/paths.js';
import { updateStats } from '../stats/calculator.js';

const logger = createLogger('OmnySys:tunnel:vision:logger');

/**
 * Guarda un evento de tunnel vision detectado
 *
 * Formato JSONL (JSON Lines): cada línea es un JSON completo
 * Esto permite append eficiente y procesamiento stream
 */
export async function logTunnelVisionEvent(alert, context = {}) {
  try {
    // Enriquecer alerta con contexto adicional
    const event = {
      ...alert,
      context: {
        sessionId: context.sessionId || generateSessionId(),
        userAction: context.userAction || 'unknown',
        timeToResolve: context.timeToResolve || null,
        preventedBug: context.preventedBug || null,
        ...context
      },
      loggedAt: new Date().toISOString()
    };

    // Append al archivo JSONL
    const line = JSON.stringify(event) + '\n';
    await fs.appendFile(TUNNEL_VISION_LOG, line, 'utf-8');

    // Actualizar estadísticas
    await updateStats(event);

    return event;
  } catch (error) {
    logger.error('[TunnelVisionLogger] Error logging event:', error.message);
    return null;
  }
}

/**
 * Lee todos los eventos de tunnel vision
 */
export async function readAllEvents(options = {}) {
  try {
    const content = await fs.readFile(TUNNEL_VISION_LOG, 'utf-8');
    const lines = content.trim().split('\n');

    let events = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);

    // Filtros
    if (options.severity) {
      events = events.filter(e => e.severity === options.severity);
    }

    if (options.since) {
      const sinceDate = new Date(options.since);
      events = events.filter(e => new Date(e.timestamp) >= sinceDate);
    }

    if (options.limit) {
      events = events.slice(-options.limit);
    }

    return events;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}
