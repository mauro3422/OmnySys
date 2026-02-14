/**
 * @fileoverview Tunnel Vision Detector - Backward Compatibility Layer
 * 
 * This file provides backward compatibility for the refactored module.
 * All functionality has been moved to the modular architecture.
 * 
 * @deprecated Use './tunnel-vision-detector/index.js' instead
 * @module core/tunnel-vision-detector
 */

import {
  TunnelVisionDetector,
  detectTunnelVision,
  formatAlert,
  getStats,
  getModificationHistory,
  cleanupHistory,
  AtomicDetector,
  FileDetector,
  SeverityAnalyzer,
  ModificationTracker,
  AlertBuilder,
  AlertFormatter
} from './tunnel-vision-detector/index.js';

// Re-export all public APIs for backward compatibility
export {
  TunnelVisionDetector,
  detectTunnelVision,
  formatAlert,
  getStats,
  getModificationHistory,
  cleanupHistory,
  AtomicDetector,
  FileDetector,
  SeverityAnalyzer,
  ModificationTracker,
  AlertBuilder,
  AlertFormatter
};

export default TunnelVisionDetector;
