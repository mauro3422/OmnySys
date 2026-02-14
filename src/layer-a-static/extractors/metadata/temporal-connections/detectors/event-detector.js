/**
 * @fileoverview Event Detector
 * 
 * Detects event listener patterns including:
 * - addEventListener / removeEventListener
 * - EventEmitter .on / .off / .removeListener
 * - Framework-specific event patterns
 * 
 * @module layer-a-static/extractors/metadata/temporal-connections/detectors/event-detector
 */

/**
 * Event detection result
 * @typedef {Object} EventDetection
 * @property {string} type - Event type (addEventListener, EventEmitter.on, etc.)
 * @property {string} event - Event name
 * @property {boolean} hasCleanup - Whether cleanup is detected
 * @property {string} [target] - Event target if detectable
 */

/**
 * Detects event listener setup patterns
 * 
 * @implements {TemporalDetectorStrategy}
 * @param {string} code - Source code to analyze
 * @returns {EventDetection[]} Array of detected event setups
 * 
 * @example
 * const code = 'element.addEventListener("click", handler);';
 * const events = detectEvents(code);
 * // [{ type: 'addEventListener', event: 'click', hasCleanup: false }]
 */
export function detectEvents(code) {
  const events = [];
  
  // DOM addEventListener
  events.push(...detectDOMEventListeners(code));
  
  // EventEmitter patterns
  events.push(...detectEventEmitterPatterns(code));
  
  // Framework-specific patterns
  events.push(...detectFrameworkEventPatterns(code));
  
  return events;
}

/**
 * Detects DOM addEventListener patterns
 * @param {string} code - Source code
 * @returns {EventDetection[]} Detected DOM events
 */
function detectDOMEventListeners(code) {
  const events = [];
  
  // addEventListener with target and event type
  const listenerPattern = /(\w+)\.addEventListener\s*\(\s*['"](\w+)['"]/g;
  let match;
  
  while ((match = listenerPattern.exec(code)) !== null) {
    const target = match[1];
    const event = match[2];
    
    // Check for corresponding removeEventListener
    const hasCleanup = new RegExp(
      `${target}\\.removeEventListener\\s*\\(\\s*['"]${event}['"]`
    ).test(code);
    
    events.push({
      type: 'addEventListener',
      event,
      hasCleanup,
      target
    });
  }
  
  // Generic addEventListener without target detection
  const genericPattern = /addEventListener\s*\(\s*['"](\w+)['"]/g;
  const detectedEvents = new Set(events.map(e => e.event));
  
  while ((match = genericPattern.exec(code)) !== null) {
    const event = match[1];
    if (!detectedEvents.has(event)) {
      const hasCleanup = code.includes('removeEventListener');
      events.push({
        type: 'addEventListener',
        event,
        hasCleanup
      });
    }
  }
  
  return events;
}

/**
 * Detects EventEmitter patterns
 * @param {string} code - Source code
 * @returns {EventDetection[]} Detected EventEmitter events
 */
function detectEventEmitterPatterns(code) {
  const events = [];
  
  // .on patterns
  const onPattern = /(\w+)\.on\s*\(\s*['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = onPattern.exec(code)) !== null) {
    const target = match[1];
    const event = match[1];
    
    // Check for cleanup patterns
    const hasCleanup = new RegExp(
      `${target}\\.(off|removeListener)\\s*\\(\\s*['"]${event}['"]`
    ).test(code) || code.includes('.off(') || code.includes('.removeListener(');
    
    events.push({
      type: 'EventEmitter.on',
      event,
      hasCleanup,
      target
    });
  }
  
  // Generic .on patterns
  const genericOnPattern = /\.on\s*\(\s*['"]([^'"]+)['"]/g;
  const detectedEvents = new Set(events.map(e => e.event));
  
  while ((match = genericOnPattern.exec(code)) !== null) {
    const event = match[1];
    if (!detectedEvents.has(event)) {
      events.push({
        type: 'EventEmitter.on',
        event,
        hasCleanup: code.includes('.off(') || code.includes('.removeListener(')
      });
    }
  }
  
  return events;
}

/**
 * Detects framework-specific event patterns
 * @param {string} code - Source code
 * @returns {EventDetection[]} Detected framework events
 */
function detectFrameworkEventPatterns(code) {
  const events = [];
  
  // jQuery-style .on
  const jqueryPattern = /\$\([^)]+\)\.on\s*\(\s*['"](\w+)['"]/g;
  let match;
  
  while ((match = jqueryPattern.exec(code)) !== null) {
    events.push({
      type: 'jquery.on',
      event: match[1],
      hasCleanup: code.includes('.off(')
    });
  }
  
  // React synthetic events (detected via props)
  const reactEventPattern = /on([A-Z]\w+)\s*=/g;
  const reactEvents = new Set();
  
  while ((match = reactEventPattern.exec(code)) !== null) {
    const event = match[1].toLowerCase();
    if (!reactEvents.has(event)) {
      reactEvents.add(event);
      events.push({
        type: 'react-event',
        event,
        hasCleanup: true // React handles cleanup
      });
    }
  }
  
  return events;
}

/**
 * Default export for strategy pattern usage
 * @type {TemporalDetectorStrategy}
 */
export default {
  name: 'event',
  detect: detectEvents,
  supports: (code) => /(?:addEventListener|\.on\s*\(|removeEventListener|\.off\s*\()/.test(code)
};
