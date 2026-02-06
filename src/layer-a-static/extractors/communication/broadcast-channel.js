/**
 * @fileoverview broadcast-channel.js
 * 
 * Extrae uso de BroadcastChannel (comunicación entre pestañas/contextos)
 * 
 * @module extractors/communication/broadcast-channel
 */

import { getLineNumber } from '../utils.js';

/**
 * Extrae uso de BroadcastChannel
 * @param {string} code - Código fuente
 * @returns {Object} - {channels: [], all: []}
 */
export function extractBroadcastChannel(code) {
  const channels = [];
  
  // new BroadcastChannel('channel-name')
  const channelCreationPattern = /new\s+BroadcastChannel\s*\(\s*['"]([^'"]+)['"]/g;
  
  // broadcastChannel.postMessage(...) o .onmessage
  const channelUsagePattern = /(\w+)\.(postMessage|onmessage|addEventListener)\s*[\(=]/g;
  
  let match;
  while ((match = channelCreationPattern.exec(code)) !== null) {
    channels.push({
      channel: match[1],
      line: getLineNumber(code, match.index),
      type: 'broadcastChannel'
    });
  }
  
  return { channels, all: channels };
}
