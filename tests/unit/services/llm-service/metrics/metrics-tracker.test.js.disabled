import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsTracker } from '#services/llm-service/metrics/metrics-tracker.js';

describe('MetricsTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new MetricsTracker();
  });

  describe('constructor', () => {
    it('should initialize with zero metrics', () => {
      const metrics = tracker.getMetrics();
      
      expect(metrics.requestsTotal).toBe(0);
      expect(metrics.requestsSuccessful).toBe(0);
      expect(metrics.requestsFailed).toBe(0);
      expect(metrics.requestsCached).toBe(0);
      expect(metrics.latencyMsAvg).toBe(0);
    });
  });

  describe('recordRequest', () => {
    it('should increment total requests', () => {
      tracker.recordRequest();
      tracker.recordRequest();
      
      expect(tracker.getMetrics().requestsTotal).toBe(2);
    });
  });

  describe('recordSuccess', () => {
    it('should increment successful requests', () => {
      tracker.recordRequest();
      tracker.recordSuccess(100);
      
      expect(tracker.getMetrics().requestsSuccessful).toBe(1);
    });

    it('should update latency', () => {
      tracker.recordRequest();
      tracker.recordSuccess(100);
      
      expect(tracker.getMetrics().latencyMsAvg).toBe(100);
    });

    it('should calculate average latency', () => {
      tracker.recordRequest();
      tracker.recordSuccess(100);
      tracker.recordRequest();
      tracker.recordSuccess(200);
      
      expect(tracker.getMetrics().latencyMsAvg).toBe(150);
    });
  });

  describe('recordFailure', () => {
    it('should increment failed requests', () => {
      tracker.recordRequest();
      tracker.recordFailure(new Error('test'), 50);
      
      expect(tracker.getMetrics().requestsFailed).toBe(1);
    });

    it('should store last error', () => {
      const error = new Error('test error');
      tracker.recordFailure(error, 50);
      
      expect(tracker.getMetrics().lastError).toBe(error);
    });

    it('should store last error time', () => {
      tracker.recordFailure(new Error('test'), 50);
      
      expect(tracker.getMetrics().lastErrorTime).toBeDefined();
    });

    it('should track errors by type', () => {
      tracker.recordFailure(new TypeError('type error'), 50);
      tracker.recordFailure(new TypeError('another type error'), 50);
      tracker.recordFailure(new RangeError('range error'), 50);
      
      const errorsByType = tracker.getMetrics().errorsByType;
      expect(errorsByType.TypeError).toBe(2);
      expect(errorsByType.RangeError).toBe(1);
    });
  });

  describe('recordCacheHit', () => {
    it('should increment cached requests', () => {
      tracker.recordCacheHit();
      tracker.recordCacheHit();
      
      expect(tracker.getMetrics().requestsCached).toBe(2);
    });
  });

  describe('getMetrics', () => {
    it('should return all metrics', () => {
      tracker.recordRequest();
      tracker.recordSuccess(100);
      tracker.recordCacheHit();
      
      const metrics = tracker.getMetrics();
      
      expect(metrics.requestsTotal).toBe(1);
      expect(metrics.requestsSuccessful).toBe(1);
      expect(metrics.requestsCached).toBe(1);
      expect(metrics.successRate).toBeDefined();
      expect(metrics.cacheHitRate).toBeDefined();
    });

    it('should convert errorsByType to object', () => {
      tracker.recordFailure(new Error('test'), 50);
      
      const metrics = tracker.getMetrics();
      
      expect(typeof metrics.errorsByType).toBe('object');
      expect(metrics.errorsByType).not.toBeInstanceOf(Map);
    });
  });

  describe('getSummary', () => {
    it('should return summary metrics', () => {
      tracker.recordRequest();
      tracker.recordSuccess(123);
      
      const summary = tracker.getSummary();
      
      expect(summary.total).toBe(1);
      expect(summary.successful).toBe(1);
      expect(summary.failed).toBe(0);
      expect(summary.cached).toBe(0);
      expect(summary.avgLatency).toBe(123);
      expect(summary.successRate).toBe(100);
    });

    it('should round values', () => {
      tracker.recordRequest();
      tracker.recordSuccess(123);
      tracker.recordRequest();
      tracker.recordSuccess(124);
      
      const summary = tracker.getSummary();
      
      expect(summary.avgLatency).toBe(124);
    });
  });

  describe('success rate calculation', () => {
    it('should calculate 100% success rate', () => {
      tracker.recordRequest();
      tracker.recordSuccess(100);
      
      expect(tracker.getMetrics().successRate).toBe(100);
    });

    it('should calculate 0% success rate', () => {
      tracker.recordRequest();
      tracker.recordFailure(new Error('test'), 50);
      
      expect(tracker.getMetrics().successRate).toBe(0);
    });

    it('should calculate 50% success rate', () => {
      tracker.recordRequest();
      tracker.recordSuccess(100);
      tracker.recordRequest();
      tracker.recordFailure(new Error('test'), 50);
      
      expect(tracker.getMetrics().successRate).toBe(50);
    });

    it('should return 0 when no requests', () => {
      expect(tracker.getMetrics().successRate).toBe(0);
    });
  });

  describe('cache hit rate calculation', () => {
    it('should calculate cache hit rate', () => {
      tracker.recordRequest();
      tracker.recordRequest();
      tracker.recordCacheHit();
      
      expect(tracker.getMetrics().cacheHitRate).toBe(50);
    });

    it('should return 0 when no requests', () => {
      expect(tracker.getMetrics().cacheHitRate).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset all metrics', () => {
      tracker.recordRequest();
      tracker.recordSuccess(100);
      tracker.recordCacheHit();
      tracker.recordFailure(new Error('test'), 50);
      
      tracker.reset();
      
      const metrics = tracker.getMetrics();
      expect(metrics.requestsTotal).toBe(0);
      expect(metrics.requestsSuccessful).toBe(0);
      expect(metrics.requestsFailed).toBe(0);
      expect(metrics.requestsCached).toBe(0);
    });
  });
});
