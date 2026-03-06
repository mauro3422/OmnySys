/**
 * @fileoverview Canonical async/error conformance heuristics.
 *
 * Detects runtime/compiler modules that orchestrate async flows, external I/O
 * or timeout/restart logic without consistently expressing a canonical
 * error-handling boundary.
 *
 * @module shared/compiler/async-error-conformance
 */

import {
  COMPILER_TARGET_DIRS,
  isCompilerRuntimeFile
} from './file-discovery.js';

function normalizePath(filePath = '') {
  return String(filePath || '').replace(/\\/g, '/');
}

function shouldScanCompilerFile(filePath = '') {
  return isCompilerRuntimeFile(normalizePath(filePath), COMPILER_TARGET_DIRS);
}

function createFinding(rule, severity, policyArea, message, recommendation) {
  return {
    rule,
    severity,
    policyArea,
    message,
    recommendation
  };
}

function stripComments(source = '') {
  return String(source || '')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function stripStrings(source = '') {
  return String(source || '')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '``');
}

function countMatches(source = '', pattern) {
  return (source.match(pattern) || []).length;
}

function countAsyncPressureSignals(source = '') {
  return countMatches(
    source,
    /\bawait\b|Promise\.all|Promise\.race|Promise\.allSettled|setTimeout\(|setInterval\(|queueMicrotask\(|restartPromise|reconnectPromise|fetch\(|StreamableHTTP|spawn\(/g
  );
}

function hasExplicitErrorBoundary(source = '') {
  return (
    /\btry\s*\{/.test(source) ||
    /\.catch\s*\(/.test(source) ||
    /Promise\.allSettled/.test(source) ||
    /\bwithRetry\b|\bretryable\b|buildRestartLifecycleGuidance|buildCompilerReadinessStatus/.test(source)
  );
}

function hasDelegatedRecoveryContract(source = '') {
  return (
    /extends\s+BaseStrategy/.test(source) ||
    /_requestWorkerRestart\s*\(/.test(source) ||
    /reloadHandler\.reload\s*\(/.test(source) ||
    /stateHandler\.(preserve|restore)\s*\(/.test(source)
  );
}

function looksLikeAsyncRuntimeFlow(source = '') {
  return (
    /\basync\b/.test(source) ||
    /\bawait\b/.test(source) ||
    /Promise\./.test(source) ||
    /setTimeout\(|setInterval\(/.test(source)
  );
}

function hasTimeoutOrRestartPressure(source = '') {
  return /(timeout|deadline|restart|reconnect|respawn|retry|bridge recovering|DAEMON_RESTARTING)/i.test(source);
}

export function detectAsyncErrorConformanceFromSource(filePath, source = '', options = {}) {
  const {
    severity = 'medium',
    policyArea = 'async_error'
  } = options;

  const normalizedPath = normalizePath(filePath);
  if (!shouldScanCompilerFile(normalizedPath) || !source) {
    return [];
  }

  const runtimeSource = stripStrings(stripComments(source));
  const findings = [];
  const asyncPressureSignals = countAsyncPressureSignals(runtimeSource);
  const hasErrorHandling = hasExplicitErrorBoundary(runtimeSource);
  const hasRecoveryContract = hasDelegatedRecoveryContract(runtimeSource);
  const asyncRuntimePath =
    normalizedPath.includes('/mcp/') ||
    normalizedPath.includes('/file-watcher/') ||
    normalizedPath.includes('/orchestrator/') ||
    normalizedPath.includes('/shared/compiler/');

  if (
    asyncRuntimePath &&
    looksLikeAsyncRuntimeFlow(runtimeSource) &&
    asyncPressureSignals >= 4 &&
    !hasErrorHandling &&
    !hasRecoveryContract
  ) {
    findings.push(createFinding(
      'async_flow_without_error_boundary',
      severity,
      policyArea,
      `Async/runtime flow shows ${asyncPressureSignals} pressure signals without an explicit error boundary`,
      'Route async orchestration through a canonical retry/error boundary so restarts, timeouts and external calls do not fail silently.'
    ));
  }

  if (
    asyncRuntimePath &&
    (looksLikeAsyncRuntimeFlow(runtimeSource) || /_requestWorkerRestart\s*\(|reloadHandler\.reload\s*\(|setTimeout\(|process\.send\s*\(/.test(runtimeSource)) &&
    hasTimeoutOrRestartPressure(runtimeSource) &&
    !hasErrorHandling &&
    !hasRecoveryContract
  ) {
    findings.push(createFinding(
      'restart_or_timeout_without_recovery_contract',
      severity,
      policyArea,
      'Restart/timeout handling detected without an explicit recovery contract',
      'Use canonical restart/error lifecycle helpers before adding more timeout or reconnect branches inline.'
    ));
  }

  return findings;
}
