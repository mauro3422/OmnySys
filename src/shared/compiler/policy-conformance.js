/**
 * @fileoverview policy-conformance.js
 *
 * Reglas compartidas para detectar deriva de políticas del compilador.
 * La idea es detectar cuándo un módulo del watcher/MCP vuelve a implementar
 * a mano señales que ya tienen una API canónica.
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
import { buildCanonicalReuseGuidance } from './canonical-reuse-guidance.js';
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
  CANONICAL_BYPASS: 'canonical_bypass'
};

import {
  normalizePath,
  shouldScanCompilerFile,
  createFinding as baseCreateFinding
} from './conformance-utils.js';

function createFinding(rule, severity, policyArea, message, recommendation) {
  const finding = baseCreateFinding({ rule, severity, policyArea, message, recommendation });
  const reuseGuidance = buildCanonicalReuseGuidance(finding);
  if (reuseGuidance) {
    finding.reuseGuidance = reuseGuidance;
  }
  return finding;
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

  const importsSnapshot = /loadCompilerDiagnosticsSnapshot/.test(source);
  if (importsSnapshot) {
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

  const matchedSignals = canonicalSignals.filter((pattern) => pattern.test(source)).length;
  return matchedSignals >= 3;
}

function buildPolicyImportMap(source = '') {
  return {
    importsGetAllAtoms: /getAllAtoms/.test(source),
    importsImpactApis: /getFileDependents|getTransitiveDependents|getFileImpactSummary|classifyImpactSeverity/.test(source),
    importsDuplicateApi: /getDuplicateKeySqlForMode|getDuplicateKeySql|getStructuralDuplicateKeySql|buildDuplicateWhereSql|normalizeDuplicateCandidateAtom|getValidDnaPredicate|DUPLICATE_MODES/.test(source),
    importsFileDiscoveryApi: /discoverCompilerFiles|discoverProjectSourceFiles|isCompilerRuntimeFile/.test(source),
    importsSignalCoverageApi: /summarizeDerivedScoreCoverage|summarizeSemanticCoverage|classifyFieldCoverage/.test(source),
    importsLiveRowDriftApi: /getLiveRowDriftSummary|getStaleTableRowCount|getLiveFileTotal|getLiveFileSetSql/.test(source),
    importsLiveRowSyncApi: /ensureLiveRowSync/.test(source),
    importsPipelineOrphansApi: /classifyPipelineOrphans|getPipelineOrphanSummary|getPipelineNamePatternSqlCondition|isLikelyDisconnectedPipelineAtom|normalizePipelineOrphan|buildPipelineOrphanRemediationPlan/.test(source),
    importsDeadCodeApi: /getSuspiciousDeadCodeCount|getDeadCodePlausibilitySummary|getDeadCodeSqlPredicate|loadSuspiciousDeadCodeCandidates|buildDeadCodeRemediationPlan/.test(source),
    importsRuntimeOwnershipApi: /getDaemonOwnerLockPath|writeDaemonOwnerLockSync|removeDaemonOwnerLockSync|readDaemonOwnerLock|waitForDaemonOwner|isCompilerProcessAlive/.test(source)
  };
}

function collectManualPolicyFindings(normalizedPath, source, imports) {
  const checks = [
    {
      when: imports.importsGetAllAtoms &&
        /atom\.name\s*===\s*symbolName|instance\.name\s*===\s*symbolName/.test(source),
      finding: createFinding(
        'manual_symbol_duplicate_scan',
        COMPILER_POLICY_SEVERITY.MEDIUM,
        COMPILER_POLICY_AREA.DUPLICATES,
        'Manual symbol duplicate scan detected',
        'Use repository-backed duplicate/symbol APIs instead of scanning getAllAtoms() in memory.'
      )
    },
    {
      when: imports.importsGetAllAtoms && looksLikeManualTopologyScan(source) && !imports.importsImpactApis,
      finding: createFinding(
        'manual_topology_scan',
        COMPILER_POLICY_SEVERITY.HIGH,
        COMPILER_POLICY_AREA.IMPACT,
        'Manual topology/impact scan detected',
        'Use the canonical impact APIs (getFileImpactSummary / getFileDependents / getTransitiveDependents) instead of rebuilding impact from getAllAtoms().'
      )
    },
    {
      when: /json_extract\([^)]*dna_json/.test(source) &&
        /duplicate_key|DuplicateGroups/.test(source) &&
        !imports.importsDuplicateApi &&
        !normalizedPath.endsWith('/duplicate-dna.js'),
      finding: createFinding(
        'manual_duplicate_sql',
        COMPILER_POLICY_SEVERITY.HIGH,
        COMPILER_POLICY_AREA.DUPLICATES,
        'Manual duplicate DNA SQL detected',
        'Build duplicate keys through duplicate-dna.js / repository utils barrel instead of embedding SQL fragments.'
      )
    },
    {
      when: /fs\.readdir|fs\.readFile/.test(source) &&
        /collectFilesRecursively|readdirSync|walkDir|walkDirectory/.test(source) &&
        (normalizedPath.includes('/mcp/') || normalizedPath.includes('/shared/compiler/')) &&
        !imports.importsFileDiscoveryApi,
      finding: createFinding(
        'manual_file_discovery_scan',
        COMPILER_POLICY_SEVERITY.MEDIUM,
        COMPILER_POLICY_AREA.FILE_DISCOVERY,
        'Manual file discovery scan detected inside MCP/compiler runtime',
        'Prefer canonical query/storage APIs before walking the filesystem manually inside MCP/runtime code.'
      )
    },
    {
      when: true, // Siempre evaluamos la deriva de señales ahora via el nuevo detector
      findings: (normalizedPath, source) => detectSignalCoverageDrift(source, normalizedPath)
    },
    {
      when: true,
      findings: (normalizedPath, source) => detectLiveRowDrift(source, normalizedPath)
    },
    {
      when:
        imports.importsLiveRowDriftApi &&
        !imports.importsLiveRowSyncApi &&
        (normalizedPath.includes('/mcp/') || normalizedPath.includes('/query/')) &&
        !normalizedPath.endsWith('/live-row-utils.js'),
      finding: createFinding(
        'live_row_sync_missing',
        COMPILER_POLICY_SEVERITY.MEDIUM,
        COMPILER_POLICY_AREA.LIVE_ROW_DRIFT,
        'Module reads live/stale row drift without the canonical synchronization entrypoint',
        'Use ensureLiveRowSync in MCP/query runtime modules so support-table drift is reconciled before reporting.'
      )
    },
    {
      when: true,
      findings: (normalizedPath, source) => detectPipelineOrphanDrift(source, normalizedPath)
    },
    {
      when: true,
      findings: (normalizedPath, source) => detectDeadCodeDrift(source, normalizedPath)
    },
    {
      when: looksLikeManualRuntimeOwnership(source) &&
        !imports.importsRuntimeOwnershipApi &&
        !normalizedPath.endsWith('/runtime-ownership.js'),
      finding: createFinding(
        'manual_runtime_ownership',
        COMPILER_POLICY_SEVERITY.MEDIUM,
        COMPILER_POLICY_AREA.RUNTIME_OWNERSHIP,
        'Manual daemon ownership/lock logic detected',
        'Use runtime-ownership.js from shared/compiler instead of reimplementing daemon owner lock handling inline.'
      )
    },
    {
      when: looksLikeCanonicalDiagnosticsBypass(normalizedPath, source),
      finding: createFinding(
        'canonical_diagnostics_bypass',
        COMPILER_POLICY_SEVERITY.HIGH,
        COMPILER_POLICY_AREA.CANONICAL_BYPASS,
        'Module recomposes canonical compiler diagnostics instead of using the shared snapshot entrypoint',
        'Use loadCompilerDiagnosticsSnapshot from shared/compiler/index.js before creating another local diagnostics wrapper.'
      )
    }
  ];

  return checks.flatMap((check) => {
    if (!check.when) {
      return [];
    }

    if (typeof check.findings === 'function') {
      return check.findings(normalizedPath, source).filter(Boolean);
    }

    return check.finding ? [check.finding] : [];
  });
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
    normalizedPath.endsWith('/shared-state-guard.js')
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
