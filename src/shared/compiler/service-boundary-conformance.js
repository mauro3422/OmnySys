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

import {
  normalizePath,
  shouldScanCompilerFile,
  createPositionalFinding as createFinding,
  stripComments
} from './conformance-utils.js';


function importsCompilerApi(source = '') {
  return /shared\/compiler\/index\.js|buildCompiler|summarizeCompiler|classifyPipelineOrphans|ensureLiveRowSync|cleanupOrphanedCompilerArtifacts|hasPersistedCompilerAnalysis|getPersistedIndexedFilePaths|removePersistedFileMetadata|removePersistedAtomMetadata|emitOrphanedImportsFromPersistedMetadata/.test(source);
}

function getBoundaryHits(source = '') {
  const sanitizedSource = stripStrings(stripComments(source));
  const hits = new Set();

  if (/db\.prepare\(|repo\.db|getRepository\(|better-sqlite3|deleteFile\(|deleteByFile\(/.test(sanitizedSource)) hits.add('database');
  if (/fs\.|fsPromises|readdir|readFile|writeFile|stat\(|unlink\(|mkdir\(/.test(sanitizedSource)) hits.add('filesystem');
  if (/fetch\(|http\.|https\.|StreamableHTTP|spawn\(/.test(sanitizedSource)) hits.add('runtime_io');
  if (importsCompilerApi(source)) hits.add('compiler');
  if (/watcher|semantic_issues|persistWatcherIssue|runImpactGuards|runSemanticGuards|collectRecentNotifications|normalizeRecentNotifications/i.test(source)) hits.add('watcher');
  if (/query_graph|traverse_graph|getFileImpactSummary|getTransitiveDependents|getAtomDetails|getProjectMetadata|findCallSites/.test(sanitizedSource)) hits.add('graph_query');

  return Array.from(hits);
}

function isLegitimateOrchestratorPath(normalizedPath = '') {
  return normalizedPath.includes('/mcp/tools/handlers/')
    || normalizedPath.includes('/mcp/core/hot-reload-manager/')
    || normalizedPath.endsWith('/file-handlers.js')
    || normalizedPath.endsWith('/pipeline-health-handler.js')
    || normalizedPath.endsWith('/status.js')
    || normalizedPath.endsWith('/watcher-handler.js')
    || normalizedPath.endsWith('/recent-notifications.js');
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
  const isLegitimateOrchestrator = isLegitimateOrchestratorPath(normalizedPath);
  const isBoundarySensitivePath =
    normalizedPath.includes('/mcp/tools/') ||
    normalizedPath.includes('/mcp/core/') ||
    normalizedPath.includes('/core/file-watcher/') ||
    normalizedPath.includes('/shared/compiler/');

  if (isBoundarySensitivePath && boundaries.length >= (isLegitimateOrchestrator ? 5 : 4)) {
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
    !boundaries.includes('compiler') &&
    !isLegitimateOrchestrator
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
