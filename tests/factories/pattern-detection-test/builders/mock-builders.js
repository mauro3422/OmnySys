/**
 * @fileoverview Mock Builders
 * 
 * Builders for creating mock objects for pattern detection tests.
 * 
 * @module tests/factories/pattern-detection-test/builders/mock-builders
 */

import { vi } from 'vitest';

/**
 * Create a mock detector
 */
export function createMockDetector(overrides = {}) {
  return {
    id: 'mock-detector',
    name: 'Mock Detector',
    priority: 50,
    loader: vi.fn().mockResolvedValue({
      default: class MockDetector {
        getId() { return 'mock'; }
        async detect() { return this.createMockResult(); }
        createMockResult() {
          return {
            detector: 'mock',
            name: 'Mock',
            findings: [],
            score: 100,
            weight: 0.1
          };
        }
      }
    }),
    ...overrides
  };
}

/**
 * Create a mock detection result
 */
export function createMockResult(overrides = {}) {
  return {
    detector: 'mock-detector',
    name: 'Mock Detector',
    description: 'A mock detector for testing',
    findings: [],
    score: 100,
    weight: 0.1,
    recommendation: 'No issues found',
    ...overrides
  };
}

/**
 * Create a mock finding
 */
export function createMockFinding(overrides = {}) {
  return {
    id: 'finding-1',
    type: 'test_finding',
    severity: 'medium',
    file: 'src/test.js',
    line: 10,
    message: 'Test finding message',
    recommendation: 'Fix this issue',
    metadata: {},
    ...overrides
  };
}

/**
 * Create registry with registered detectors
 */
export function createRegistryWithDetectors(registry, detectorConfigs = []) {
  detectorConfigs.forEach(config => {
    registry.register({
      id: config.id,
      priority: config.priority || 50,
      loader: config.loader || vi.fn()
    });
  });
  return registry;
}
