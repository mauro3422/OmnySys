/**
 * @fileoverview Detector Runner Tests
 * 
 * Tests for DetectorRunner.
 * 
 * @module tests/unit/layer-a-analysis/pattern-detection/detector-runner
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DetectorRunner } from '#layer-a/pattern-detection/runners/DetectorRunner.js';
import { PatternDetectionTestFactory } from '../../../factories/pattern-detection-test.factory.js';

describe('DetectorRunner', () => {
  let runner;
  let systemMap;

  beforeEach(() => {
    runner = new DetectorRunner();
    systemMap = PatternDetectionTestFactory.createComplexSystemMap();
  });

  /**
   * ============================================
   * STRUCTURE CONTRACT
   * ============================================
   */

  describe('Structure Contract', () => {
    it('should be instantiable with default options', () => {
      expect(runner).toBeInstanceOf(DetectorRunner);
    });

    it('should accept custom options', () => {
      const customRunner = new DetectorRunner({
        onError: vi.fn(),
        timeout: 5000
      });
      expect(customRunner.timeout).toBe(5000);
    });

    it('should use console.error as default onError', () => {
      expect(runner.onError).toBe(console.error);
    });

    it('should use 30000ms as default timeout', () => {
      expect(runner.timeout).toBe(30000);
    });

    it('should have run method', () => {
      expect(typeof runner.run).toBe('function');
    });

    it('should have executeDetector method', () => {
      expect(typeof runner.executeDetector).toBe('function');
    });

    it('should have runAll method', () => {
      expect(typeof runner.runAll).toBe('function');
    });
  });

  /**
   * ============================================
   * EXECUTION CONTRACT
   * ============================================
   */

  describe('Execution Contract', () => {
    it('should run a detector successfully', async () => {
      const mockDetector = {
        id: 'test',
        loader: vi.fn().mockResolvedValue({
          default: class {
            async detect() {
              return { detector: 'test', score: 100, findings: [] };
            }
          }
        })
      };

      const result = await runner.run(mockDetector, systemMap);
      expect(result).toHaveProperty('detector', 'test');
      expect(result).toHaveProperty('score', 100);
    });

    it('should pass systemMap to detector', async () => {
      let receivedSystemMap;
      const mockDetector = {
        id: 'test',
        loader: vi.fn().mockResolvedValue({
          default: class {
            async detect(map) {
              receivedSystemMap = map;
              return { detector: 'test', score: 100 };
            }
          }
        })
      };

      await runner.run(mockDetector, systemMap);
      expect(receivedSystemMap).toBe(systemMap);
    });

    it('should handle detector returning null', async () => {
      const mockDetector = {
        id: 'null-detector',
        loader: vi.fn().mockResolvedValue({
          default: class {
            async detect() {
              return null;
            }
          }
        })
      };

      const result = await runner.run(mockDetector, systemMap);
      expect(result).toBeNull();
    });

    it('should handle detector returning undefined', async () => {
      const mockDetector = {
        id: 'undefined-detector',
        loader: vi.fn().mockResolvedValue({
          default: class {
            async detect() {
              return undefined;
            }
          }
        })
      };

      const result = await runner.run(mockDetector, systemMap);
      expect(result).toBeUndefined();
    });
  });

  /**
   * ============================================
   * TIMEOUT CONTRACT
   * ============================================
   */

  describe('Timeout Contract', () => {
    it('should timeout slow detectors', async () => {
      const slowRunner = new DetectorRunner({ timeout: 50 });
      const mockDetector = {
        id: 'slow',
        loader: vi.fn().mockResolvedValue({
          default: class {
            async detect() {
              await new Promise(resolve => setTimeout(resolve, 100));
              return { detector: 'slow', score: 100 };
            }
          }
        })
      };

      const result = await slowRunner.run(mockDetector, systemMap);
      expect(result.error).toContain('timeout');
    });

    it('should not timeout fast detectors', async () => {
      const mockDetector = {
        id: 'fast',
        loader: vi.fn().mockResolvedValue({
          default: class {
            async detect() {
              return { detector: 'fast', score: 100 };
            }
          }
        })
      };

      const result = await runner.run(mockDetector, systemMap);
      expect(result.error).toBeUndefined();
      expect(result.score).toBe(100);
    });

    it('should use custom timeout', async () => {
      const fastRunner = new DetectorRunner({ timeout: 5000 });
      const mockDetector = {
        id: 'normal',
        loader: vi.fn().mockResolvedValue({
          default: class {
            async detect() {
              await new Promise(resolve => setTimeout(resolve, 10));
              return { detector: 'normal', score: 100 };
            }
          }
        })
      };

      const result = await fastRunner.run(mockDetector, systemMap);
      expect(result.error).toBeUndefined();
    });
  });

  /**
   * ============================================
   * ERROR HANDLING CONTRACT
   * ============================================
   */

  describe('Error Handling Contract', () => {
    it('should handle detector loader errors', async () => {
      const mockError = new Error('Loader failed');
      const mockDetector = {
        id: 'failing-loader',
        loader: vi.fn().mockRejectedValue(mockError)
      };

      const result = await runner.run(mockDetector, systemMap);
      expect(result.detector).toBe('failing-loader');
      expect(result.error).toBe('Loader failed');
      expect(result.findings).toEqual([]);
      expect(result.score).toBe(100);
    });

    it('should handle detector constructor errors', async () => {
      const mockDetector = {
        id: 'failing-constructor',
        loader: vi.fn().mockResolvedValue({
          default: class {
            constructor() {
              throw new Error('Constructor failed');
            }
          }
        })
      };

      const result = await runner.run(mockDetector, systemMap);
      expect(result.detector).toBe('failing-constructor');
      expect(result.error).toBe('Constructor failed');
    });

    it('should handle detector detect errors', async () => {
      const mockDetector = {
        id: 'failing-detect',
        loader: vi.fn().mockResolvedValue({
          default: class {
            async detect() {
              throw new Error('Detect failed');
            }
          }
        })
      };

      const result = await runner.run(mockDetector, systemMap);
      expect(result.detector).toBe('failing-detect');
      expect(result.error).toBe('Detect failed');
    });

    it('should call onError callback on failure', async () => {
      const onError = vi.fn();
      const errorRunner = new DetectorRunner({ onError });
      const mockDetector = {
        id: 'error-detector',
        loader: vi.fn().mockRejectedValue(new Error('Failed'))
      };

      await errorRunner.run(mockDetector, systemMap);
      expect(onError).toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(
        'Detector error-detector failed:',
        expect.any(Error)
      );
    });

    it('should return safe fallback on error', async () => {
      const mockDetector = {
        id: 'error-detector',
        loader: vi.fn().mockRejectedValue(new Error('Failed'))
      };

      const result = await runner.run(mockDetector, systemMap);
      expect(result).toEqual({
        detector: 'error-detector',
        findings: [],
        score: 100,
        error: 'Failed'
      });
    });
  });

  /**
   * ============================================
   * BATCH EXECUTION CONTRACT
   * ============================================
   */

  describe('Batch Execution Contract', () => {
    it('should run multiple detectors', async () => {
      const detectors = [
        {
          id: 'det1',
          loader: vi.fn().mockResolvedValue({
            default: class {
              async detect() { return { detector: 'det1', score: 90 }; }
            }
          })
        },
        {
          id: 'det2',
          loader: vi.fn().mockResolvedValue({
            default: class {
              async detect() { return { detector: 'det2', score: 80 }; }
            }
          })
        }
      ];

      const results = await runner.runAll(detectors, systemMap);
      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled');
    });

    it('should handle mixed success and failure in batch', async () => {
      const detectors = [
        {
          id: 'success',
          loader: vi.fn().mockResolvedValue({
            default: class {
              async detect() { return { detector: 'success', score: 100 }; }
            }
          })
        },
        {
          id: 'failure',
          loader: vi.fn().mockRejectedValue(new Error('Failed'))
        }
      ];

      const results = await runner.runAll(detectors, systemMap);
      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled'); // Error is caught and wrapped
    });

    it('should run detectors in parallel', async () => {
      let callOrder = [];
      const detectors = [
        {
          id: 'slow',
          loader: vi.fn().mockResolvedValue({
            default: class {
              async detect() {
                callOrder.push('slow-start');
                await new Promise(resolve => setTimeout(resolve, 20));
                callOrder.push('slow-end');
                return { detector: 'slow' };
              }
            }
          })
        },
        {
          id: 'fast',
          loader: vi.fn().mockResolvedValue({
            default: class {
              async detect() {
                callOrder.push('fast-start');
                await new Promise(resolve => setTimeout(resolve, 5));
                callOrder.push('fast-end');
                return { detector: 'fast' };
              }
            }
          })
        }
      ];

      await runner.runAll(detectors, systemMap);
      expect(callOrder).toContain('slow-start');
      expect(callOrder).toContain('fast-start');
    });

    it('should handle empty detector array', async () => {
      const results = await runner.runAll([], systemMap);
      expect(results).toEqual([]);
    });
  });

  /**
   * ============================================
   * MODULE LOADING CONTRACT
   * ============================================
   */

  describe('Module Loading Contract', () => {
    it('should load default export', async () => {
      const mockDetector = {
        id: 'default-export',
        loader: vi.fn().mockResolvedValue({
          default: class {
            async detect() { return { detector: 'default' }; }
          }
        })
      };

      const result = await runner.run(mockDetector, systemMap);
      expect(result.detector).toBe('default');
    });

    it('should load first named export if no default', async () => {
      const mockDetector = {
        id: 'named-export',
        loader: vi.fn().mockResolvedValue({
          MyDetector: class {
            async detect() { return { detector: 'named' }; }
          }
        })
      };

      const result = await runner.run(mockDetector, systemMap);
      expect(result.detector).toBe('named');
    });

    it('should pass config to detector constructor', async () => {
      let receivedConfig;
      const mockDetector = {
        id: 'config-test',
        config: { threshold: 10 },
        globalConfig: { weights: { test: 0.5 } },
        loader: vi.fn().mockResolvedValue({
          default: class {
            constructor(options) {
              receivedConfig = options;
            }
            async detect() { return {}; }
          }
        })
      };

      await runner.executeDetector(mockDetector, systemMap);
      expect(receivedConfig).toEqual({
        config: { threshold: 10 },
        globalConfig: { weights: { test: 0.5 } }
      });
    });

    it('should handle empty module exports', async () => {
      const mockDetector = {
        id: 'empty-module',
        loader: vi.fn().mockResolvedValue({})
      };

      await expect(runner.run(mockDetector, systemMap)).rejects.toThrow();
    });
  });
});
