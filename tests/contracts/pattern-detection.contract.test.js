/**
 * Pattern Detection Contract Tests
 * 
 * Verifies that ALL pattern detectors conform to the same interface.
 * Ensures the "GPS traffic alert system" works consistently.
 */

import { describe, it, expect } from 'vitest';
import { HotspotsDetector } from '#layer-a/pattern-detection/detectors/hotspots-detector.js';
import { PatternDetector } from '#layer-a/pattern-detection/detector-base.js';

/**
 * All detectors under test
 */
const DETECTORS = [
  {
    name: 'HotspotsDetector',
    class: HotspotsDetector,
    expectedId: 'hotspots'
  }
];

/**
 * Structure Contract - All detectors must return consistent structure
 */
describe.each(DETECTORS)('$name: Structure Contract', ({ class: DetectorClass, expectedId }) => {
  it('must extend PatternDetector base class', () => {
    const detector = new DetectorClass({ globalConfig: {} });
    expect(detector).toBeInstanceOf(PatternDetector);
  });

  it('must implement getId() method', () => {
    const detector = new DetectorClass({ globalConfig: {} });
    expect(detector.getId()).toBe(expectedId);
  });

  it('must implement getName() method', () => {
    const detector = new DetectorClass({ globalConfig: {} });
    expect(typeof detector.getName()).toBe('string');
    expect(detector.getName().length).toBeGreaterThan(0);
  });

  it('must implement getDescription() method', () => {
    const detector = new DetectorClass({ globalConfig: {} });
    expect(typeof detector.getDescription()).toBe('string');
    expect(detector.getDescription().length).toBeGreaterThan(0);
  });

  it('must return DetectionResult from detect()', async () => {
    const detector = new DetectorClass({ globalConfig: { weights: { [expectedId]: 0.1 } } });
    const result = await detector.detect({ functions: {}, function_links: [] });
    
    expect(result).toHaveProperty('detector');
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('description');
    expect(result).toHaveProperty('findings');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('weight');
    expect(result).toHaveProperty('recommendation');
  });

  it('must return array of findings', async () => {
    const detector = new DetectorClass({ globalConfig: { weights: { [expectedId]: 0.1 } } });
    const result = await detector.detect({ functions: {}, function_links: [] });
    
    expect(Array.isArray(result.findings)).toBe(true);
  });

  it('must return score between 0 and 100', async () => {
    const detector = new DetectorClass({ globalConfig: { weights: { [expectedId]: 0.1 } } });
    const result = await detector.detect({ functions: {}, function_links: [] });
    
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

/**
 * Error Handling Contract - All detectors must handle errors gracefully
 */
describe.each(DETECTORS)('$name: Error Handling Contract', ({ class: DetectorClass }) => {
  it('must not throw on empty system map', async () => {
    const detector = new DetectorClass({ globalConfig: { weights: {} } });
    
    await expect(detector.detect({})).resolves.not.toThrow();
  });

  it('must not throw on null/undefined input', async () => {
    const detector = new DetectorClass({ globalConfig: { weights: {} } });
    
    await expect(detector.detect(null)).resolves.not.toThrow();
    await expect(detector.detect(undefined)).resolves.not.toThrow();
  });

  it('must return valid result even when no patterns found', async () => {
    const detector = new DetectorClass({ globalConfig: { weights: {} } });
    const result = await detector.detect({ functions: {}, function_links: [] });
    
    expect(result.findings).toBeDefined();
    expect(result.score).toBeDefined();
  });
});

/**
 * Finding Structure Contract - All findings must have consistent structure
 */
describe('Pattern Detection Finding Structure', () => {
  it('hotspot findings must have required fields', async () => {
    const detector = new HotspotsDetector({
      config: { minUsageThreshold: 3 },
      globalConfig: { weights: { hotspots: 0.15 } }
    });

    const systemMap = {
      functions: {
        'test.js::bigFunc': { name: 'bigFunc', hasSideEffects: true }
      },
      function_links: Array(10).fill(0).map((_, i) => ({
        from: `file${i}.js::call`,
        to: 'test.js::bigFunc'
      }))
    };

    const result = await detector.detect(systemMap);
    
    if (result.findings.length > 0) {
      const finding = result.findings[0];
      expect(finding).toHaveProperty('id');
      expect(finding).toHaveProperty('type');
      expect(finding).toHaveProperty('severity');
      expect(finding).toHaveProperty('message');
      expect(finding).toHaveProperty('recommendation');
      expect(finding).toHaveProperty('metadata');
    }
  });
});

/**
 * Performance Contract - All detectors must be fast
 */
describe.each(DETECTORS)('$name: Performance Contract', ({ class: DetectorClass }) => {
  it('should complete in under 100ms for small inputs', async () => {
    const detector = new DetectorClass({ globalConfig: { weights: {} } });
    const systemMap = { functions: {}, function_links: [] };
    
    const start = performance.now();
    await detector.detect(systemMap);
    const end = performance.now();
    
    expect(end - start).toBeLessThan(100);
  });
});

/**
 * Cross-Detector Consistency
 */
describe('Cross-Detector Consistency', () => {
  it('all detectors should use consistent severity levels', async () => {
    const validSeverities = ['low', 'medium', 'high', 'critical', 'info'];
    
    const detector = new HotspotsDetector({
      config: { minUsageThreshold: 3 },
      globalConfig: { weights: { hotspots: 0.15 } }
    });

    const systemMap = {
      functions: { 'test.js::func': { name: 'func', hasSideEffects: true } },
      function_links: Array(10).fill(0).map((_, i) => ({
        from: `file${i}.js::call`,
        to: 'test.js::func'
      }))
    };

    const result = await detector.detect(systemMap);
    
    for (const finding of result.findings) {
      expect(validSeverities).toContain(finding.severity);
    }
  });
});
