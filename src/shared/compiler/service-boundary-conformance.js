/**
 * @fileoverview Canonical service boundary conformance heuristics.
 *
 * Flags compiler/runtime modules that start mixing too many concerns inline
 * instead of delegating to canonical services or query/repository layers.
 *
 * @module shared/compiler/service-boundary-conformance
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

function getBoundaryHits(source = '') {
  const hits = new Set();

  if (/db\.prepare\(|SELECT\s+|INSERT\s+|UPDATE\s+|DELETE\s+|sqlite/i.test(source)) hits.add('database');
  if (/fs\.|fsPromises|readdir|readFile|writeFile|scanProject/.test(source)) hits.add('filesystem');
  if (/fetch\(|http\.|https\.|StreamableHTTP|spawn\(/.test(source)) hits.add('runtime_io');
  if (/shared\/compiler\/index\.js|buildCompiler|summarizeCompiler|classifyPipelineOrphans/.test(source)) hits.add('compiler');
  if (/watcher|semantic_issues|persistWatcherIssue|runImpactGuards|runSemanticGuards/i.test(source)) hits.add('watcher');
  if (/repo\.|query_graph|traverse_graph|getFileImpactSummary|getTransitiveDependents/.test(source)) hits.add('graph_query');

  return Array.from(hits);
}

export function detectServiceBoundaryConformanceFromSource(filePath, source = '', options = {}) {
  const {
    severity = 'medium',
    policyArea = 'service_boundary'
  } = options;

  const normalizedPath = normalizePath(filePath);
  if (!shouldScanCompilerFile(normalizedPath) || !source) {
    return [];
  }

  const findings = [];
  const boundaries = getBoundaryHits(source);
  const isBoundarySensitivePath =
    normalizedPath.includes('/mcp/tools/') ||
    normalizedPath.includes('/mcp/core/') ||
    normalizedPath.includes('/core/file-watcher/') ||
    normalizedPath.includes('/shared/compiler/');

  if (isBoundarySensitivePath && boundaries.length >= 4) {
    findings.push(createFinding(
      'overloaded_service_boundary',
      severity,
      policyArea,
      `Module mixes ${boundaries.length} service boundaries (${boundaries.join(', ')})`,
      'Split the module across canonical services/helpers so runtime, watcher, repository and compiler concerns stop accumulating in one file.'
    ));
  }

  if (
    isBoundarySensitivePath &&
    boundaries.includes('database') &&
    boundaries.includes('filesystem') &&
    !boundaries.includes('compiler')
  ) {
    findings.push(createFinding(
      'missing_compiler_service_bridge',
      severity,
      policyArea,
      'Module mixes filesystem and database concerns without going through compiler services',
      'Introduce or consume a canonical compiler service instead of coupling filesystem discovery directly to persistence logic.'
    ));
  }

  return findings;
}
