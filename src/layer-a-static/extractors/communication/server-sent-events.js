/**
 * @fileoverview server-sent-events.js
 * 
 * Extrae conexiones Server-Sent Events (EventSource)
 * 
 * @module extractors/communication/server-sent-events
 */

import { getLineNumber } from '../utils.js';

/**
 * Extrae conexiones Server-Sent Events (EventSource)
 * @param {string} code - Código fuente
 * @returns {Object} - {urls: [], events: [], all: []}
 */
export function extractServerSentEvents(code) {
  const urls = [];
  const events = [];
  
  // new EventSource('url')
  const esPattern = /new\s+EventSource\s*\(\s*['"]([^'"]+)['"]/g;
  
  // eventSource.addEventListener('event-name', ...)
  const esEventPattern = /\w+\.addEventListener\s*\(\s*['"]([^'"]+)['"]/g;
  
  let match;
  while ((match = esPattern.exec(code)) !== null) {
    urls.push({
      url: match[1],
      line: getLineNumber(code, match.index),
      type: 'eventsource_url'
    });
  }
  
  while ((match = esEventPattern.exec(code)) !== null) {
    events.push({
      event: match[1],
      line: getLineNumber(code, match.index),
      type: 'eventsource_event'
    });
  }
  
  return { urls, events, all: [...urls, ...events] };
}
