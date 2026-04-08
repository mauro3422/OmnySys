/**
 * @fileoverview Centralized Health API
 *
 * Unified endpoint that aggregates:
 * - Daemon health status
 * - Memory metrics with leak detection
 * - Proxy/bridge runtime telemetry
 * - Database health
 * - Watcher alerts summary
 *
 * Usage: GET /api/health
 *
 * @module api/health
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:api:health');

// Memory leak detection thresholds (ABSOLUTE MB, not percentages)
// OmnySystem legitimately uses 600-900MB after initialization
const MEMORY_THRESHOLDS = {
  WARNING: 2000,      // 2GB - start monitoring
  CRITICAL: 3500,     // 3.5GB - force GC and investigate
  DEGRADED: 4000,     // 4GB - mark as degraded
  EMERGENCY: 5000     // 5GB - immediate restart recommended
};

// Track memory samples for trend detection
const memorySamples = [];
const MAX_SAMPLES = 60; // Keep last 60 samples (10 minutes at 10s intervals)

/**
 * Collects a memory sample and detects trends
 */
function collectMemorySample(memoryUsage) {
  const sample = {
    timestamp: Date.now(),
    heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
    externalMB: Math.round(memoryUsage.external / 1024 / 1024),
    heapUsagePercent: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
  };

  memorySamples.push(sample);
  if (memorySamples.length > MAX_SAMPLES) {
    memorySamples.shift();
  }

  return sample;
}

/**
 * Analyzes memory trend to detect leaks
 */
function analyzeMemoryTrend() {
  if (memorySamples.length < 10) {
    return { trend: 'insufficient_data', samplesCollected: memorySamples.length };
  }

  const recent = memorySamples.slice(-10);
  const older = memorySamples.slice(-20, -10);

  const recentAvg = recent.reduce((sum, s) => sum + s.heapUsedMB, 0) / recent.length;
  const olderAvg = older.reduce((sum, s) => sum + s.heapUsedMB, 0) / older.length;

  const growthRateMB = recentAvg - olderAvg;
  const growthRatePercent = ((recentAvg - olderAvg) / olderAvg) * 100;

  let trend = 'stable';
  if (growthRatePercent > 5) trend = 'growing_fast';
  else if (growthRatePercent > 2) trend = 'growing_slow';
  else if (growthRatePercent < -2) trend = 'shrinking';

  return {
    trend,
    growthRateMB: Math.round(growthRateMB * 100) / 100,
    growthRatePercent: Math.round(growthRatePercent * 100) / 100,
    recentAvgMB: Math.round(recentAvg),
    olderAvgMB: Math.round(olderAvg),
    samplesCollected: memorySamples.length
  };
}

/**
 * Forces garbage collection and measures impact
 */
async function forceGCAndMeasure() {
  if (!global.gc) {
    return { available: false, reason: 'GC not exposed (run with --expose-gc)' };
  }

  const before = process.memoryUsage();
  const heapUsedBefore = before.heapUsed;

  // Force GC
  global.gc();

  // Wait a bit for GC to complete
  await new Promise(resolve => setTimeout(resolve, 100));

  const after = process.memoryUsage();
  const heapUsedAfter = after.heapUsed;
  const freedMB = Math.round((heapUsedBefore - heapUsedAfter) / 1024 / 1024);

  return {
    available: true,
    freedMB,
    heapUsedBeforeMB: Math.round(heapUsedBefore / 1024 / 1024),
    heapUsedAfterMB: Math.round(heapUsedAfter / 1024 / 1024),
    effective: freedMB > 50
  };
}

/**
 * Builds comprehensive health report
 */
export async function buildComprehensiveHealth(server) {
  const memoryUsage = process.memoryUsage();
  const currentSample = collectMemorySample(memoryUsage);
  const trend = analyzeMemoryTrend();

  // Determine memory status
  let memoryStatus = 'healthy';
  let memoryAction = 'none';

  if (currentSample.heapUsagePercent >= MEMORY_THRESHOLDS.EMERGENCY) {
    memoryStatus = 'emergency';
    memoryAction = 'immediate_restart_recommended';
  } else if (currentSample.heapUsagePercent >= MEMORY_THRESHOLDS.DEGRADED) {
    memoryStatus = 'degraded';
    memoryAction = 'force_gc_and_monitor';
  } else if (currentSample.heapUsagePercent >= MEMORY_THRESHOLDS.CRITICAL) {
    memoryStatus = 'warning';
    memoryAction = 'schedule_gc';
  } else if (currentSample.heapUsagePercent >= MEMORY_THRESHOLDS.WARNING) {
    memoryStatus = 'elevated';
    memoryAction = 'monitor';
  }

  // Check for leak pattern
  const hasLeakPattern = trend.trend === 'growing_fast' || trend.trend === 'growing_slow';

  // Build health report
  const healthReport = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    pid: process.pid,

    // Memory diagnostics
    memory: {
      current: currentSample,
      trend,
      status: memoryStatus,
      action: memoryAction,
      leakDetected: hasLeakPattern,
      thresholds: MEMORY_THRESHOLDS,
      gcAvailable: !!global.gc
    },

    // Daemon status
    daemon: {
      status: server?.initialized ? 'healthy' : 'starting',
      initialized: server?.initialized || false,
      sessionCount: server?.sessions?.size || 0,
      projectPath: server?.projectPath || null
    },

    // Quick recommendations
    recommendations: []
  };

  // Generate recommendations
  if (memoryStatus === 'emergency') {
    healthReport.recommendations.push({
      severity: 'critical',
      action: 'restart_daemon',
      reason: `Heap usage at ${currentSample.heapUsagePercent}% - immediate restart recommended`,
      details: 'Memory usage is critically high. Restart the daemon to free memory.'
    });
  }

  if (hasLeakPattern && trend.growthRateMB > 10) {
    healthReport.recommendations.push({
      severity: 'high',
      action: 'investigate_leak',
      reason: `Memory growing at ${trend.growthRateMB}MB per sample interval`,
      details: 'Potential memory leak detected. Check for unclosed connections, event listeners, or growing caches.'
    });
  }

  if (memoryStatus === 'degraded' || memoryStatus === 'warning') {
    healthReport.recommendations.push({
      severity: 'medium',
      action: 'force_gc',
      reason: `Heap usage at ${currentSample.heapUsagePercent}%`,
      details: 'Consider forcing garbage collection to free memory.'
    });
  }

  if (trend.trend === 'growing_slow' && memorySamples.length >= 20) {
    healthReport.recommendations.push({
      severity: 'low',
      action: 'monitor',
      reason: 'Slow memory growth detected over extended period',
      details: 'Monitor for continued growth. May indicate gradual leak.'
    });
  }

  return healthReport;
}

/**
 * Handles GET /api/health request
 */
export async function handleHealthApiRequest(req, res, server) {
  try {
    const action = req.query?.action;

    // Handle special actions
    if (action === 'force-gc') {
      const gcResult = await forceGCAndMeasure();
      return res.json({
        action: 'force-gc',
        result: gcResult,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'trend') {
      const trend = analyzeMemoryTrend();
      return res.json({
        action: 'trend',
        trend,
        samplesCollected: memorySamples.length,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'samples') {
      return res.json({
        action: 'samples',
        samples: memorySamples,
        count: memorySamples.length,
        timestamp: new Date().toISOString()
      });
    }

    // Default: comprehensive health report
    const healthReport = await buildComprehensiveHealth(server);
    res.json(healthReport);

  } catch (error) {
    logger.error(`Health API error: ${error.message}`);
    res.status(500).json({
      error: 'Health check failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

export default {
  buildComprehensiveHealth,
  handleHealthApiRequest,
  MEMORY_THRESHOLDS,
  collectMemorySample,
  analyzeMemoryTrend,
  forceGCAndMeasure
};
