/**
 * @fileoverview index.js
 * 
 * Shared Objects Detector V2 - Main entry point (backward compatible)
 * 
 * Detecta objetos compartidos mutables que son REALMENTE problemáticos.
 * Distingue entre:
 * - CONFIG (bajo riesgo): Constantes de configuración
 * - STATE (alto riesgo): Estado mutable compartido
 * - UTILS (bajo riesgo): Funciones puras compartidas
 * 
 * @module pattern-detection/detectors/shared-objects
 */

import { SharedObjectsDetector } from './detectors/shared-detector.js';
import { analyzeRiskProfile } from './analyzers/risk-analyzer.js';

export { SharedObjectsDetector, analyzeRiskProfile };
export default SharedObjectsDetector;
