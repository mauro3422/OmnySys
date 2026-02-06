/**
 * @fileoverview window-postmessage.js
 * 
 * Extrae postMessage entre ventanas (parent/opener/iframe)
 * 
 * @module extractors/communication/window-postmessage
 */

import { getLineNumber } from '../utils.js';

/**
 * Extrae postMessage entre ventanas
 * @param {string} code - Código fuente
 * @returns {Object} - {outgoing: [], incoming: [], all: []}
 */
export function extractWindowPostMessage(code) {
  const outgoing = [];
  const incoming = [];
  
  // window.parent.postMessage(...) o parent.postMessage(...)
  // window.opener.postMessage(...)
  // iframe.contentWindow.postMessage(...)
  const postMessagePattern = /(?:window\.)?(?:parent|opener|top)\.postMessage\s*\(/g;
  
  // window.addEventListener('message', ...)
  const messageListenerPattern = /(?:window\.)?addEventListener\s*\(\s*['"]message['"]/g;
  
  // window.onmessage = ...
  const onmessagePattern = /(?:window\.)?onmessage\s*=/g;
  
  let match;
  while ((match = postMessagePattern.exec(code)) !== null) {
    outgoing.push({
      type: 'window_postmessage_outgoing',
      target: match[0].includes('parent') ? 'parent' : 
              match[0].includes('opener') ? 'opener' : 'top',
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = messageListenerPattern.exec(code)) !== null) {
    incoming.push({
      type: 'window_postmessage_listener',
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = onmessagePattern.exec(code)) !== null) {
    incoming.push({
      type: 'window_onmessage',
      line: getLineNumber(code, match.index)
    });
  }
  
  return { outgoing, incoming, all: [...outgoing, ...incoming] };
}
