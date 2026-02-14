/**
 * @fileoverview broken-connections-detector.js
 * 
 * Backward compatibility wrapper.
 * Use './index.js' for new code.
 * 
 * @deprecated Use './index.js' instead
 * @module analyses/tier3/broken-connections-detector
 */

export {
  BrokenConnectionsDetector,
  BrokenConnectionsDetector as default,
  detectBrokenWorkers,
  detectBrokenDynamicImports,
  detectDuplicateFunctions,
  detectDeadFunctions,
  detectSuspiciousUrls,
  analyzeBrokenConnections
} from './index.js';

// Re-export from detectors for backward compatibility
import { BrokenConnectionsDetector } from './detectors/BrokenConnectionsDetector.js';

const detector = new BrokenConnectionsDetector();

export function detectBrokenWorkers(systemMap, advancedAnalysis) {
  return detector.detectBrokenWorkers(systemMap, advancedAnalysis);
}

export function detectBrokenDynamicImports(systemMap) {
  return detector.detectBrokenDynamicImports(systemMap);
}

export function detectDuplicateFunctions(systemMap) {
  return detector.detectDuplicateFunctions(systemMap);
}

export function detectDeadFunctions(systemMap) {
  return detector.detectDeadFunctions(systemMap);
}

export function detectSuspiciousUrls(advancedAnalysis) {
  return detector.detectSuspiciousUrls(advancedAnalysis);
}

export function analyzeBrokenConnections(systemMap, advancedAnalysis) {
  return detector.analyze(systemMap, advancedAnalysis);
}
