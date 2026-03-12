/**
 * @fileoverview policy-conformance.js
 *
 * Reglas compartidas para detectar deriva de politicas del compilador.
 * La idea es detectar cuando un modulo del watcher/MCP vuelve a implementar
 * a mano senales que ya tienen una API canonica.
 *
 * @module shared/compiler/policy-conformance
 */

import fs from 'fs/promises';
import path from 'path';
import {
  COMPILER_TARGET_DIRS,
  discoverCompilerFiles,
  isCompilerRuntimeFile
} from './file-discovery.js';
import { detectStateOwnershipConformanceFromSource } from './state-ownership-conformance.js';
import { detectServiceBoundaryConformanceFromSource } from './service-boundary-conformance.js';
import { detectCanonicalExtensionConformanceFromSource } from './canonical-extension-conformance.js';
import { detectAsyncErrorConformanceFromSource } from './async-error-conformance.js';
import { detectSharedStateHotspotConformanceFromSource } from './shared-state-hotspot-conformance.js';
import { detectTestabilityConformanceFromSource } from './testability-conformance.js';
import { detectSemanticPurityConformanceFromSource } from './semantic-purity-conformance.js';
import { detectMetadataPropagationConformanceFromSource } from './metadata-propagation-conformance.js';
import { detectSemanticSurfaceGranularityConformanceFromSource } from './semantic-surface-granularity-conformance.js';
import { detectSignalCoverageDrift } from './signal-coverage.js';
import { detectPipelineOrphanDrift } from './pipeline-orphans.js';
import { detectDeadCodeDrift } from './dead-code-utils.js';
import { detectLiveRowDrift } from './live-row-utils.js';
import {
  normalizePath,
  shouldScanCompilerFile,
  createGuidedFinding
} from './conformance-utils.js';

export const COMPILER_POLICY_SEVERITY = {
  HIGH: 'high',
  MEDIUM: 'medium'
};

export const COMPILER_POLICY_AREA = {
  DUPLICATES: 'duplicates',
  IMPACT: 'impact',
  FILE_DISCOVERY: 'file_discovery',
  SIGNAL_COVERAGE: 'signal_coverage',
  LIVE_ROW_DRIFT: 'live_row_drift',
  PIPELINE_ORPHANS: 'pipeline_orphans',
  RUNTIME_OWNERSHIP: 'runtime_ownership',
  STATE_OWNERSHIP: 'state_ownership',
  SERVICE_BOUNDARY: 'service_boundary',
  CANONICAL_EXTENSION: 'canonical_extension',
  ASYNC_ERROR: 'async_error',
  SHARED_STATE_HOTSPOTS: 'shared_state_hotspots',
  CENTRALITY_COVERAGE: 'centrality_coverage',
  TESTABILITY: 'testability',
  SEMANTIC_PURITY: 'semantic_purity',
  METADATA_PROPAGATION: 'metadata_propagation',
  SEMANTIC_SURFACE_GRANULARITY: 'semantic_surface_granularity',
  WATCHER_DIAGNOSTICS: 'watcher_diagnostics',
  WATCHER_LIFECYCLE: 'watcher_lifecycle',
  CANONICAL_BYPASS: 'canonical_bypass'
};

function maybeFinding(when, params) {
  return when ? [createGuidedFinding(params)] : [];
}

function looksLikeManualTopologyScan(source = '') {
  const manualGraphWalk =
    /(allAtoms|graphAtoms)\.(filter|map|reduce|find)\([\s\S]{0,600}?(calledBy|callerId|calls?|callees?|dependents?|affectedFiles|dependencyTree|brokenCallers|totalCallers)/.test(source) ||
    /new\s+Set\(\)\s*;[\s\S]{0,600}?(affectedFiles\.add|dependents\.push|dependencyTree\.push)/.test(source) ||
    /(callerId|calledBy|calls?)\?.*(filter|map|some|find)\(/.test(source);

  const topologyReportingOnly =
    /(buildKeyMetrics|deriveSchema|computeCorrelations|fieldEvolution|schemaType\s*:\s*['"]atoms['"])/.test(source) &&
    !/(affectedFiles\.add|dependents\.push|dependencyTree\.push|brokenCallers|totalCallers)/.test(source);

  return manualGraphWalk && !topologyReportingOnly;
}

function looksLikeManualRuntimeOwnership(source = '') {
  return /getDaemonOwnerLockPath|writeDaemonOwnerLockSync|removeDaemonOwnerLockSync|readDaemonOwnerLock|waitForDaemonOwner|isCompilerProcessAlive/.test(source);
}

function looksLikeCanonicalDiagnosticsBypass(normalizedPath, source = '') {
  if (!source) {
    return false;
  }

  if (
    normalizedPath.endsWith('/compiler-diagnostics-snapshot.js') ||
    normalizedPath.startsWith('src/shared/compiler/')
  ) {
    return false;
  }

  if (/loadCompilerDiagnosticsSnapshot/.test(source)) {
    return false;
  }

  const canonicalSignals = [
    /buildCompilerStandardizationReport/,
    /buildCompilerContractLayer/,
    /summarizePersistedScannedFileCoverage/,
    /syncPersistedScannedFileManifest/,
    /getFileImportEvidenceCoverage/,
    /getSystemMapPersistenceCoverage/,
    /getMetadataSurfaceParity/,
    /getSemanticSurfaceGranularity/,
    /summarizeSemanticCanonicality/,
    /getFileUniverseGranularity/
  ];

  return canonicalSignals.filter((pattern) => pattern.test(source)).length >= 3;
}

function looksLikeWatcherDiagnosticsDrift(normalizedPath, source = '') {
  if (!source || normalizedPath.startsWith('src/shared/compiler/')) {
    return false;
  }

  const touchesWatcherPersistence =
    /semantic_issues|persistWatcherIssue|clearWatcherIssue|reconcileWatcherIssues|findOutdatedWatcherAlertIds|findSupersededWatcherAlertIds/.test(source);
  const touchesCanonicalWatcherSurface =
    /mapSemanticIssueRowToWatcherAlert|attachWatcherAlertLifecycle|filterWatcherAlertsByLifecycle|partitionWatcherAlertsByLifecycle/.test(source);
  const touchesCanonicalAtomSurface =
    /FROM\s+atoms|SELECT[\s\S]{0,120}FROM\s+atoms|ensureLiveRowSync|loadCompilerDiagnosticsSnapshot/.test(source);

  return touchesWatcherPersistence && touchesCanonicalWatcherSurface && touchesCanonicalAtomSurface;
}

function buildPolicyImportMap(source = '') {
  return {
    importsGetAllAtoms: /getAllAtoms/.test(source),
    importsImpactApis: /getFileDependents|getTransitiveDependents|getFileImpactSummary|classifyImpactSeverity/.test(source),
    importsDuplicateApi: /getDuplicateKeySqlForMode|getDuplicateKeySql|getStructuralDuplicateKeySql|buildDuplicateWhereSql|normalizeDuplicateCandidateAtom|getValidDnaPredicate|DUPLICATE_MODES/.test(source),
    importsFileDiscoveryApi: /discoverCompilerFiles|discoverProjectSourceFiles|isCompilerRuntimeFile/.test(source),
    importsLiveRowDriftApi: /getLiveRowDriftSummary|getStaleTableRowCount|getLiveFileTotal|getLiveFileSetSql/.test(source),
    importsLiveRowSyncApi: /ensureLiveRowSync/.test(source),
    importsRuntimeOwnershipApi: /getDaemonOwnerLockPath|writeDaemonOwnerLockSync|removeDaemonOwnerLockSync|readDaemonOwnerLock|waitForDaemonOwner|isCompilerProcessAlive/.test(source)
  };
}

function collectManualReuseFindings(normalizedPath, source, imports) {
  return [
    ...maybeFinding(
      imports.importsGetAllAtoms &&
      /atom\.name\s*===\s*symbolName|instance\.name\s*===\s*symbolName/.test(source),
      {
        rule: 'manual_symbol_duplicate_scan',
        severity: COMPILER_POLICY_SEVERITY.MEDIUM,
        policyArea: COMPILER_POLICY_AREA.DUPLICATES,
        message: 'Manual symbol duplicate scan detected',
        recommendation: 'Use repository-backed duplicate/symbol APIs instead of scanning getAllAtoms() in memory.'
      }
    ),
    ...maybeFinding(
      imports.importsGetAllAtoms && looksLikeManualTopologyScan(source) && !imports.importsImpactApis,
      {
        rule: 'manual_topology_scan',
        severity: COMPILER_POLICY_SEVERITY.HIGH,
        policyArea: COMPILER_POLICY_AREA.IMPACT,
        message: 'Manual topology/impact scan detected',
        recommendation: 'Use the canonical impact APIs (getFileImpactSummary / getFileDependents / getTransitiveDependents) instead of rebuilding impact from getAllAtoms().'
      }
    ),
    ...maybeFinding(
      /json_extract\([^)]*dna_json/.test(source) &&
      /duplicate_key|DuplicateGroups/.test(source) &&
      !imports.importsDuplicateApi &&
      !normalizedPath.endsWith('/duplicate-dna.js'),
      {
        rule: 'manual_duplicate_sql',
        severity: COMPILER_POLICY_SEVERITY.HIGH,
        policyArea: COMPILER_POLICY_AREA.DUPLICATES,
        message: 'Manual duplicate DNA SQL detected',
        recommendation: 'Build duplicate keys through duplicate-dna.js / repository utils barrel instead of embedding SQL fragments.'
      }
    ),
    ...maybeFinding(
      /fs\.readdir|fs\.readFile/.test(source) &&
      /collectFilesRecursively|readdirSync|walkDir|walkDirectory/.test(source) &&
      (normalizedPath.includes('/mcp/') || normalizedPath.includes('/shared/compiler/')) &&
      !imports.importsFileDiscoveryApi,
      {
        rule: 'manual_file_discovery_scan',
        severity: COMPILER_POLICY_SEVERITY.MEDIUM,
        policyArea: COMPILER_POLICY_AREA.FILE_DISCOVERY,
        message: 'Manual file discovery scan detected inside MCP/compiler runtime',
        recommendation: 'Prefer canonical query/storage APIs before walking the filesystem manually inside MCP/runtime code.'
      }
    ),
    ...maybeFinding(
      imports.importsLiveRowDriftApi &&
      !imports.importsLiveRowSyncApi &&
      (normalizedPath.includes('/mcp/') || normalizedPath.includes('/query/')) &&
      !normalizedPath.endsWith('/live-row-utils.js'),
      {
        rule: 'live_row_sync_missing',
        severity: COMPILER_POLICY_SEVERITY.MEDIUM,
        policyArea: COMPILER_POLICY_AREA.LIVE_ROW_DRIFT,
        message: 'Module reads live/stale row drift without the canonical synchronization entrypoint',
        recommendation: 'Use ensureLiveRowSync in MCP/query runtime modules so support-table drift is reconciled before reporting.'
      }
    ),
    ...maybeFinding(
      looksLikeManualRuntimeOwnership(source) &&
      !imports.importsRuntimeOwnershipApi &&
      !normalizedPath.endsWith('/runtime-ownership.js'),
      {
        rule: 'manual_runtime_ownership',
        severity: COMPILER_POLICY_SEVERITY.MEDIUM,
        policyArea: COMPILER_POLICY_AREA.RUNTIME_OWNERSHIP,
        message: 'Manual daemon ownership/lock logic detected',
        recommendation: 'Use runtime-ownership.js from shared/compiler instead of reimplementing daemon owner lock handling inline.'
      }
    ),
    ...maybeFinding(
      looksLikeWatcherDiagnosticsDrift(normalizedPath, source),
      {
        rule: 'manual_watcher_diagnostics_reconciliation',
        severity: COMPILER_POLICY_SEVERITY.MEDIUM,
        policyArea: COMPILER_POLICY_AREA.WATCHER_DIAGNOSTICS,
        message: 'Module mixes watcher persistence, lifecycle and canonical atom/diagnostics reads without a dedicated canonical watcher reconciliation API',
        recommendation: 'Route watcher reconciliation through shared/compiler watcher diagnostics helpers instead of composing semantic_issues, lifecycle and atoms heuristics inline.'
      }
    ),
    ...maybeFinding(
      looksLikeCanonicalDiagnosticsBypass(normalizedPath, source),
      {
        rule: 'canonical_diagnostics_bypass',
        severity: COMPILER_POLICY_SEVERITY.HIGH,
        policyArea: COMPILER_POLICY_AREA.CANONICAL_BYPASS,
        message: 'Module recomposes canonical compiler diagnostics instead of using the shared snapshot entrypoint',
        recommendation: 'Use loadCompilerDiagnosticsSnapshot from shared/compiler/index.js before creating another local diagnostics wrapper.'
      }
    )
  ];
}

function collectManualDriftFindings(normalizedPath, source) {
  return [
    ...detectSignalCoverageDrift(source, normalizedPath).filter(Boolean),
    ...detectLiveRowDrift(source, normalizedPath).filter(Boolean),
    ...detectPipelineOrphanDrift(source, normalizedPath).filter(Boolean),
    ...detectDeadCodeDrift(source, normalizedPath).filter(Boolean)
  ];
}

function collectManualPolicyFindings(normalizedPath, source, imports) {
  return [
    ...collectManualReuseFindings(normalizedPath, source, imports),
    ...collectManualDriftFindings(normalizedPath, source)
  ];
}

function collectConformanceFindings(normalizedPath, source) {
  const conformanceDetectors = [
    [detectStateOwnershipConformanceFromSource, COMPILER_POLICY_AREA.STATE_OWNERSHIP],
    [detectServiceBoundaryConformanceFromSource, COMPILER_POLICY_AREA.SERVICE_BOUNDARY],
    [detectCanonicalExtensionConformanceFromSource, COMPILER_POLICY_AREA.CANONICAL_EXTENSION],
    [detectAsyncErrorConformanceFromSource, COMPILER_POLICY_AREA.ASYNC_ERROR],
    [detectSharedStateHotspotConformanceFromSource, COMPILER_POLICY_AREA.SHARED_STATE_HOTSPOTS],
    [detectTestabilityConformanceFromSource, COMPILER_POLICY_AREA.TESTABILITY],
    [detectSemanticPurityConformanceFromSource, COMPILER_POLICY_AREA.SEMANTIC_PURITY],
    [detectMetadataPropagationConformanceFromSource, COMPILER_POLICY_AREA.METADATA_PROPAGATION],
    [detectSemanticSurfaceGranularityConformanceFromSource, COMPILER_POLICY_AREA.SEMANTIC_SURFACE_GRANULARITY]
  ];

  return conformanceDetectors.flatMap(([detector, policyArea]) => detector(normalizedPath, source, {
    severity: COMPILER_POLICY_SEVERITY.MEDIUM,
    policyArea
  }));
}

export function detectCompilerPolicyDriftFromSource(filePath, source = '') {
  const normalizedPath = normalizePath(filePath);

  if (!shouldScanCompilerFile(normalizedPath) || !source) {
    return [];
  }

  if (
    normalizedPath.endsWith('/guard-standards.js') ||
    normalizedPath.endsWith('/shared-state-guard.js') ||
    normalizedPath.endsWith('/duplicate-conceptual-core.js')
  ) {
    return [];
  }

  const imports = buildPolicyImportMap(source);
  return [
    ...collectManualPolicyFindings(normalizedPath, source, imports),
    ...collectConformanceFindings(normalizedPath, source)
  ];
}

export function summarizeCompilerPolicyDrift(findings = []) {
  const normalizedFindings = findings.filter(Boolean);
  const summary = {
    total: normalizedFindings.length,
    high: 0,
    medium: 0,
    byPolicyArea: {},
    byRule: {}
  };

  for (const finding of normalizedFindings) {
    if (finding?.severity === COMPILER_POLICY_SEVERITY.HIGH) summary.high += 1;
    if (finding?.severity === COMPILER_POLICY_SEVERITY.MEDIUM) summary.medium += 1;
    const policyArea = finding?.policyArea || 'unknown';
    const rule = finding?.rule || 'unknown';
    summary.byPolicyArea[policyArea] = (summary.byPolicyArea[policyArea] || 0) + 1;
    summary.byRule[rule] = (summary.byRule[rule] || 0) + 1;
  }

  return summary;
}

export function buildCompilerPolicyIssueSummary(findings = []) {
  const normalizedFindings = findings.filter(Boolean);
  const summary = summarizeCompilerPolicyDrift(normalizedFindings);
  const severity = summary.high > 0 ? COMPILER_POLICY_SEVERITY.HIGH : COMPILER_POLICY_SEVERITY.MEDIUM;
  const sampleRules = normalizedFindings.map((finding) => finding?.rule || 'unknown').slice(0, 3).join(', ');
  const reuseGuidance = normalizedFindings
    .map((finding) => finding.reuseGuidance)
    .filter(Boolean);

  return {
    severity,
    summary,
    sampleRules,
    reuseGuidance,
    message: `${summary.total} compiler policy drift finding(s): ${sampleRules || 'unspecified'}`.trim()
  };
}

export async function scanCompilerPolicyDrift(rootPath, options = {}) {
  const { limit = 20 } = options;
  const files = await discoverCompilerFiles(rootPath);
  const findings = [];

  for (const filePath of files) {
    const absolutePath = path.join(rootPath, filePath);
    const source = await fs.readFile(absolutePath, 'utf8').catch(() => null);
    if (!source) continue;

    const localFindings = detectCompilerPolicyDriftFromSource(filePath, source);
    for (const finding of localFindings) {
      findings.push({
        ...finding,
        filePath
      });
      if (findings.length >= limit) {
        return findings;
      }
    }
  }

  return findings;
}
