/**
 * @fileoverview websocket.js
 * 
 * Extrae conexiones WebSocket
 * 
 * @module extractors/communication/websocket
 */

import { getLineNumber } from '../utils.js';

/**
 * Extrae conexiones WebSocket
 * @param {string} code - Código fuente
 * @returns {Object} - {urls: [], events: [], all: []}
 */
export function extractWebSocket(code) {
  const urls = [];
  const events = [];
  
  // new WebSocket('ws://...' o 'wss://...')
  const wsPattern = /new\s+WebSocket\s*\(\s*['"]([^'"]+)['"]/g;
  
  // Eventos de WebSocket: onopen, onmessage, onclose, onerror
  const wsEventPattern = /\w+\.(onopen|onmessage|onclose|onerror)\s*=\s*(?:function|\(|\w+)/g;
  
  let match;
  while ((match = wsPattern.exec(code)) !== null) {
    urls.push({
      url: match[1],
      line: getLineNumber(code, match.index),
      type: 'websocket_url'
    });
  }
  
  while ((match = wsEventPattern.exec(code)) !== null) {
    events.push({
      event: match[1],
      line: getLineNumber(code, match.index),
      type: 'websocket_event'
    });
  }
  
  return { urls, events, all: [...urls, ...events] };
}
