/**
 * @fileoverview Invariant Detector - Detecta propiedades garantizadas del código
 * 
 * Analiza el grafo de transformaciones para encontrar:
 * - Type invariants: "x siempre es number después de línea 12"
 * - Range invariants: "total siempre >= 0"
 * - Null-safety: "obj nunca es null después del check"
 * - Pureza de funciones
 * - Idempotencia
 * 
 * @module data-flow/analyzers/invariant-detector
 * 
 * @version 0.9.4 - Migrado desde data-flow-v2
 */

import { createLogger } from '#utils/logger.js';
import { detectTypeInvariants } from './invariants/type-invariants.js';
import { detectRangeInvariants } from './invariants/range-invariants.js';
import { detectNullSafety } from './invariants/null-safety.js';
import { detectPurity } from './invariants/purity-detector.js';
import { detectIdempotence } from './invariants/idempotence-detector.js';

const logger = createLogger('OmnySys:data-flow:invariants');

export class InvariantDetector {
  constructor(graph) {
    this.graph = graph;
    this.invariants = [];
  }

  detect() {
    logger.debug('Detecting invariants...');
    
    this.invariants.push(...detectTypeInvariants(this.graph));
    this.invariants.push(...detectRangeInvariants(this.graph, this.invariants));
    this.invariants.push(...detectNullSafety(this.graph));
    this.invariants.push(...detectPurity(this.graph));
    this.invariants.push(...detectIdempotence(this.graph));

    logger.debug(`Detected ${this.invariants.length} invariants`);
    return this.invariants;
  }
}

export default InvariantDetector;
