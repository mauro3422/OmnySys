/**
 * @fileoverview Pattern Detection Module - Entry Point
 * 
 * Exporta todo el sistema de detección de patrones.
 * 
 * @module pattern-detection
 */

// Core
export { PatternDetectionEngine } from './engine.js';
export { PatternDetector } from './detector-base.js';
export { PatternDetectorRegistry } from './registry.js';
export { QualityScoreAggregator } from './aggregator.js';

// Detectores
export { DeepChainsDetector } from './detectors/deep-chains-detector.js';
export { SharedObjectsDetector } from './detectors/shared-objects-detector.js';

// Configuración por defecto
export { DEFAULT_CONFIG } from './engine.js';

// Versión
export const VERSION = '2.0.0';
