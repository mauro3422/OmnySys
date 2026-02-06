/**
 * @fileoverview message-channel.js
 * 
 * Extrae uso de MessageChannel y MessagePort
 * 
 * @module extractors/communication/message-channel
 */

import { getLineNumber } from '../utils.js';

/**
 * Extrae uso de MessageChannel / MessagePort
 * @param {string} code - Código fuente
 * @returns {Object} - {channels: [], all: []}
 */
export function extractMessageChannel(code) {
  const channels = [];
  
  // new MessageChannel()
  const channelPattern = /new\s+MessageChannel\s*\(\s*\)/g;
  
  // Uso de port1 y port2
  const portPattern = /(\w+)\.port[12]\.(postMessage|onmessage)/g;
  
  let match;
  while ((match = channelPattern.exec(code)) !== null) {
    channels.push({
      type: 'messageChannel_creation',
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = portPattern.exec(code)) !== null) {
    channels.push({
      type: 'messageChannel_port_usage',
      port: match[0].includes('port1') ? 'port1' : 'port2',
      method: match[2],
      line: getLineNumber(code, match.index)
    });
  }
  
  return { channels, all: channels };
}
