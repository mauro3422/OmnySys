/**
 * @fileoverview Event Logger
 * 
 * Single Responsibility: Log tunnel vision events to JSONL file
 * 
 * @module tunnel-vision-logger/events/event-logger
 */

import fs from 'fs/promises';
import { TUNNEL_VISION_LOG } from '../utils/paths.js';
import { generateSessionId } from '../utils/session.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:tunnel:vision:logger');

/**
 * Log a tunnel vision event
 * @param {Object} alert - Alert data
 * @param {Object} context - Context data
 * @returns {Promise<Object|null>} Logged event or null
 */
export async function logTunnelVisionEvent(alert, context = {}) {
  try {
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

    const line = JSON.stringify(event) + '\n';
    await fs.appendFile(TUNNEL_VISION_LOG, line, 'utf-8');

    return event;
  } catch (error) {
    logger.error('[TunnelVisionLogger] Error logging event:', error.message);
    return null;
  }
}

/**
 * Read all events with optional filters
 * @param {Object} options - Filter options
 * @returns {Promise<Array>} Events
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

    // Apply filters
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
