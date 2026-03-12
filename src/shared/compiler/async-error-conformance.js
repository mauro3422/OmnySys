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
  shouldScanCompilerFile,
  stripStrings,
  stripComments,
  countAsyncPressureSignals,
  hasExplicitErrorBoundary,
  looksLikeAsyncRuntimeFlow,
  createPositionalFinding as createFinding
} from './conformance-utils.js';
import { scanCompilerConformanceSource } from './compiler-conformance-scan.js';


function hasDelegatedRecoveryContract(source = '') {
  return (
    /extends\s+BaseStrategy/.test(source) ||
    /extends\s+AtomicMutationTool/.test(source) ||
    /this\.runRoutedAction\s*\(/.test(source) ||
    /this\.dispatchByKey\s*\(/.test(source) ||
    /this\.runInTransaction\s*\(/.test(source) ||
    /runRoutedAction\s*\(\s*\{/.test(source) ||
    /runInTransaction\s*\(/.test(source) ||
    /_requestWorkerRestart\s*\(/.test(source) ||
    /reloadHandler\.reload\s*\(/.test(source) ||
    /stateHandler\.(preserve|restore)\s*\(/.test(source)
  );
}


function hasTimeoutOrRestartPressure(source = '') {
  return /(\bsetTimeout\s*\(|\bclearTimeout\s*\(|\bdeadline\b|\btimeoutMs\b|\breconnect\b|\brespawn\b|\bretry\b|_requestWorkerRestart\s*\(|reloadHandler\.reload\s*\(|process\.send\s*\(|bridge recovering|DAEMON_RESTARTING)/i.test(source);
}

function isAsyncRuntimePath(normalizedPath = '') {
  return (
    normalizedPath.includes('/mcp/') ||
    normalizedPath.includes('/file-watcher/') ||
    normalizedPath.includes('/orchestrator/') ||
    normalizedPath.includes('/shared/compiler/')
  );
}

function shouldReportAsyncFlowWithoutBoundary(runtimeSource, asyncRuntimePath, asyncPressureSignals, hasErrorHandling, hasRecoveryContract) {
  return (
    asyncRuntimePath &&
    looksLikeAsyncRuntimeFlow(runtimeSource) &&
    asyncPressureSignals >= 4 &&
    !hasErrorHandling &&
    !hasRecoveryContract
  );
}

function shouldReportRestartOrTimeoutWithoutContract(runtimeSource, asyncRuntimePath, hasErrorHandling, hasRecoveryContract) {
  const hasRestartSignals =
    looksLikeAsyncRuntimeFlow(runtimeSource) ||
    /_requestWorkerRestart\s*\(|reloadHandler\.reload\s*\(|setTimeout\(|process\.send\s*\(/.test(runtimeSource);

  return (
    asyncRuntimePath &&
    hasRestartSignals &&
    hasTimeoutOrRestartPressure(runtimeSource) &&
    !hasErrorHandling &&
    !hasRecoveryContract
  );
}

export function detectAsyncErrorConformanceFromSource(filePath, source = '', options = {}) {
  return scanCompilerConformanceSource(
    filePath,
    source,
    options,
    { severity: 'medium', policyArea: 'async_error' },
    ({ normalizedPath, source: runtimeSourceRaw, severity, policyArea, findings }) => {
      const runtimeSource = stripStrings(stripComments(runtimeSourceRaw));
      const asyncPressureSignals = countAsyncPressureSignals(runtimeSource);
      const hasErrorHandling = hasExplicitErrorBoundary(runtimeSource);
      const hasRecoveryContract = hasDelegatedRecoveryContract(runtimeSource);
      const asyncRuntimePath = isAsyncRuntimePath(normalizedPath);

      if (shouldReportAsyncFlowWithoutBoundary(
        runtimeSource,
        asyncRuntimePath,
        asyncPressureSignals,
        hasErrorHandling,
        hasRecoveryContract
      )) {
        findings.push(createFinding(
          'async_flow_without_error_boundary',
          severity,
          policyArea,
          `Async/runtime flow shows ${asyncPressureSignals} pressure signals without an explicit error boundary`,
          'Route async orchestration through a canonical retry/error boundary so restarts, timeouts and external calls do not fail silently.'
        ));
      }

      if (shouldReportRestartOrTimeoutWithoutContract(
        runtimeSource,
        asyncRuntimePath,
        hasErrorHandling,
        hasRecoveryContract
      )) {
        findings.push(createFinding(
          'restart_or_timeout_without_recovery_contract',
          severity,
          policyArea,
          'Restart/timeout handling detected without an explicit recovery contract',
          'Use canonical restart/error lifecycle helpers before adding more timeout or reconnect branches inline.'
        ));
      }
    }
  );
}
