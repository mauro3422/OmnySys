/**
 * @fileoverview Pattern Detection Test Factory
 * 
 * Factory for creating test fixtures and mocks for pattern detection tests.
 * 
 * ⚠️ DEPRECATED: This file is kept for backward compatibility.
 * Please import directly from the builders/ directory:
 *   import { createMinimalSystemMap, createMockDetector } from './builders/index.js';
 * 
 * @module tests/factories/pattern-detection-test.factory
 * @deprecated Use builders/ directory modules instead
 */

import { vi } from 'vitest';
import {
  createMinimalSystemMap,
  createComplexSystemMap,
  createHotspotsSystemMap,
  createDeepChainsSystemMap,
  createCouplingSystemMap,
  createSharedObjectsSystemMap,
  createUnusedExportsSystemMap
} from './builders/system-map-builders.js';

import {
  createMockDetector,
  createMockResult,
  createMockFinding,
  createRegistryWithDetectors
} from './builders/mock-builders.js';

import {
  createDefaultConfig
} from './builders/config-builders.js';

/**
 * Factory for creating pattern detection test fixtures
 * @deprecated Use individual builder functions from builders/ directory
 */
export class PatternDetectionTestFactory {
  static createMinimalSystemMap(overrides = {}) {
    return createMinimalSystemMap(overrides);
  }

  static createComplexSystemMap(overrides = {}) {
    return createComplexSystemMap(overrides);
  }

  static createHotspotsSystemMap() {
    return createHotspotsSystemMap();
  }

  static createDeepChainsSystemMap() {
    return createDeepChainsSystemMap();
  }

  static createCouplingSystemMap() {
    return createCouplingSystemMap();
  }

  static createSharedObjectsSystemMap() {
    return createSharedObjectsSystemMap();
  }

  static createUnusedExportsSystemMap() {
    return createUnusedExportsSystemMap();
  }

  static createDefaultConfig(overrides = {}) {
    return createDefaultConfig(overrides);
  }

  static createMockDetector(overrides = {}) {
    return createMockDetector(overrides);
  }

  static createMockResult(overrides = {}) {
    return createMockResult(overrides);
  }

  static createMockFinding(overrides = {}) {
    return createMockFinding(overrides);
  }

  static createRegistryWithDetectors(registry, detectorConfigs = []) {
    return createRegistryWithDetectors(registry, detectorConfigs);
  }
}

// Re-export individual builders for direct import
export {
  createMinimalSystemMap,
  createComplexSystemMap,
  createHotspotsSystemMap,
  createDeepChainsSystemMap,
  createCouplingSystemMap,
  createSharedObjectsSystemMap,
  createUnusedExportsSystemMap,
  createDefaultConfig,
  createMockDetector,
  createMockResult,
  createMockFinding,
  createRegistryWithDetectors
};

export default PatternDetectionTestFactory;
