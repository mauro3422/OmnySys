/**
 * @fileoverview Event Detector
 * 
 * Detects event listener and emit operations in function code
 * 
 * @module function-analyzer/detectors/event-detector
 */

/**
 * Detect event operations
 * @param {string} functionCode - Function code
 * @returns {Array} Event operations
 */
export function detectEventOps(functionCode) {
  const ops = [];
  
  // addEventListener('event', handler)
  const addListenerPattern = /addEventListener\s*\(\s*['"`](\w+)['"`]/g;
  let match;
  while ((match = addListenerPattern.exec(functionCode)) !== null) {
    ops.push({
      event: match[1],
      type: 'listen'
    });
  }
  
  // removeEventListener('event', handler)
  const removeListenerPattern = /removeEventListener\s*\(\s*['"`](\w+)['"`]/g;
  while ((match = removeListenerPattern.exec(functionCode)) !== null) {
    ops.push({
      event: match[1],
      type: 'unlisten'
    });
  }
  
  // dispatchEvent(new Event('event')) or dispatchEvent(new CustomEvent('event'))
  const dispatchPattern = /dispatchEvent\s*\(\s*(?:new\s+(?:Custom)?Event\s*\(\s*['"`](\w+)['"`])/g;
  while ((match = dispatchPattern.exec(functionCode)) !== null) {
    ops.push({
      event: match[1],
      type: 'emit'
    });
  }
  
  // emit('event') - Node.js style
  const emitPattern = /\.emit\s*\(\s*['"`](\w+)['"`]/g;
  while ((match = emitPattern.exec(functionCode)) !== null) {
    ops.push({
      event: match[1],
      type: 'emit'
    });
  }
  
  // on('event', handler) - Node.js style
  const onPattern = /\.on\s*\(\s*['"`](\w+)['"`]/g;
  while ((match = onPattern.exec(functionCode)) !== null) {
    ops.push({
      event: match[1],
      type: 'listen'
    });
  }
  
  return ops;
}
