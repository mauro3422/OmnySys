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
import { detectCentralityCoverageConformanceFromSource } from './centrality-coverage-conformance.js';
import { detectTestabilityConformanceFromSource } from './testability-conformance.js';
import { detectSemanticPurityConformanceFromSource } from './semantic-purity-conformance.js';
import { detectMetadataPropagationConformanceFromSource } from './metadata-propagation-conformance.js';
import { detectSemanticSurfaceGranularityConformanceFromSource } from './semantic-surface-granularity-conformance.js';
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
  SEMANTIC_SURFACE_GRANULARITY: 'semantic_surface_granularity'
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

function looksLikeManualDerivedScoreCoverage(source = '') {
  const derivedSignalHits = [
    /fragility_score/.test(source),
    /coupling_score/.test(source),
    /cohesion_score/.test(source)
  ].filter(Boolean).length;

  return (
    derivedSignalHits >= 2 &&
    /(missingAtoms|missingRatio|candidateAtoms|nonZeroCount|coveragePct|all zero)/.test(source)
  );
}

function looksLikeManualSemanticCoverage(source = '') {
  return (
    /(hasNetworkCalls|sharesStateRelations|sharedStateCandidates|networkCandidates|networkFlagged)/.test(source) &&
    /(look network-bound|semantic coverage|coverage gap|missing flags|network coverage|shared state relations?)/i.test(source)
  );
}

function looksLikeManualLiveRowDrift(source = '') {
  return (
    /(LEFT JOIN|NOT IN)\s+live_files/.test(source) ||
    /(staleFileRows|staleRiskRows|liveFileTotal|unassessedLiveFiles)/.test(source)
  );
}

function readsCanonicalLiveRowSyncSummary(source = '') {
  return (
    /ensureLiveRowSync\s*\(/.test(source) &&
    /liveRowSync\.summary/.test(source)
  );
}

function looksLikeManualPipelineOrphanScan(source = '') {
  return (
    /(called_by_json|calls_json|callers_count|callees_count)/.test(source) &&
    /(pipeline_orphans|orphanFunctions|patternCondition|fileLevelImportEvidence|disconnected pipeline)/i.test(source)
  );
}

function readsCanonicalPipelineOrphanSummary(source = '') {
  return (
    /(getPipelineOrphanSummary|classifyPipelineOrphans)\s*\(/.test(source) ||
    /pipelineOrphanSummary\.(orphans|warning|normalizedOrphans)/.test(source)
  );
}

function looksLikeManualRuntimeOwnership(source = '') {
  return (
    /(daemon-owner-|ownerLockPath|OWNER_LOCK_PATH|readOwnerLock|writeOwnerLock|waitForExistingOwner|removeOwnerLock)/.test(source) &&
    /(process\.kill\(.*0\)|unlink\(|writeFileSync\(|readFile\(|state=.*restarting|state=.*starting)/.test(source)
  );
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
      when: looksLikeManualDerivedScoreCoverage(source) &&
        !imports.importsSignalCoverageApi &&
        !normalizedPath.endsWith('/signal-coverage.js'),
      finding: createFinding(
        'manual_signal_coverage_scan',
        COMPILER_POLICY_SEVERITY.MEDIUM,
        COMPILER_POLICY_AREA.SIGNAL_COVERAGE,
        'Manual derived-score coverage scan detected',
        'Use summarizeDerivedScoreCoverage / classifyFieldCoverage from shared/compiler instead of recomputing coverage locally.'
      )
    },
    {
      when: looksLikeManualSemanticCoverage(source) &&
        !imports.importsSignalCoverageApi &&
        !normalizedPath.endsWith('/signal-coverage.js'),
      finding: createFinding(
        'manual_semantic_coverage_scan',
        COMPILER_POLICY_SEVERITY.MEDIUM,
        COMPILER_POLICY_AREA.SIGNAL_COVERAGE,
        'Manual semantic coverage scan detected',
        'Use summarizeSemanticCoverage from shared/compiler instead of rebuilding semantic coverage heuristics locally.'
      )
    },
    {
      when: looksLikeManualLiveRowDrift(source) &&
        !readsCanonicalLiveRowSyncSummary(source) &&
        !imports.importsLiveRowDriftApi &&
        !normalizedPath.endsWith('/live-row-drift.js'),
      finding: createFinding(
        'manual_live_row_drift_scan',
        COMPILER_POLICY_SEVERITY.MEDIUM,
        COMPILER_POLICY_AREA.LIVE_ROW_DRIFT,
        'Manual live/stale row drift logic detected',
        'Use getLiveRowDriftSummary / getStaleTableRowCount from shared/compiler instead of hand-rolling stale row SQL.'
      )
    },
    {
      when:
        imports.importsLiveRowDriftApi &&
        !imports.importsLiveRowSyncApi &&
        (normalizedPath.includes('/mcp/') || normalizedPath.includes('/query/')) &&
        !normalizedPath.endsWith('/live-row-drift.js') &&
        !normalizedPath.endsWith('/live-row-sync.js') &&
        !normalizedPath.endsWith('/live-row-cleanup.js') &&
        !normalizedPath.endsWith('/live-row-reconciliation.js'),
      finding: createFinding(
        'live_row_sync_missing',
        COMPILER_POLICY_SEVERITY.MEDIUM,
        COMPILER_POLICY_AREA.LIVE_ROW_DRIFT,
        'Module reads live/stale row drift without the canonical synchronization entrypoint',
        'Use ensureLiveRowSync in MCP/query runtime modules so support-table drift is reconciled before reporting.'
      )
    },
    {
      when: looksLikeManualPipelineOrphanScan(source) &&
        !readsCanonicalPipelineOrphanSummary(source) &&
        !imports.importsPipelineOrphansApi &&
        !normalizedPath.endsWith('/pipeline-orphans.js'),
      finding: createFinding(
        'manual_pipeline_orphan_scan',
        COMPILER_POLICY_SEVERITY.MEDIUM,
        COMPILER_POLICY_AREA.PIPELINE_ORPHANS,
        'Manual pipeline orphan classification detected',
        'Use classifyPipelineOrphans / getPipelineNamePatternSqlCondition from shared/compiler instead of rebuilding orphan heuristics inline.'
      )
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
    }
  ];

  return checks.filter((check) => check.when).map((check) => check.finding);
}

function collectConformanceFindings(normalizedPath, source) {
  const conformanceDetectors = [
    [detectStateOwnershipConformanceFromSource, COMPILER_POLICY_AREA.STATE_OWNERSHIP],
    [detectServiceBoundaryConformanceFromSource, COMPILER_POLICY_AREA.SERVICE_BOUNDARY],
    [detectCanonicalExtensionConformanceFromSource, COMPILER_POLICY_AREA.CANONICAL_EXTENSION],
    [detectAsyncErrorConformanceFromSource, COMPILER_POLICY_AREA.ASYNC_ERROR],
    [detectSharedStateHotspotConformanceFromSource, COMPILER_POLICY_AREA.SHARED_STATE_HOTSPOTS],
    [detectCentralityCoverageConformanceFromSource, COMPILER_POLICY_AREA.CENTRALITY_COVERAGE],
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
  const summary = {
    total: findings.length,
    high: 0,
    medium: 0,
    byPolicyArea: {},
    byRule: {}
  };

  for (const finding of findings) {
    if (finding?.severity === COMPILER_POLICY_SEVERITY.HIGH) summary.high += 1;
    if (finding?.severity === COMPILER_POLICY_SEVERITY.MEDIUM) summary.medium += 1;
    summary.byPolicyArea[finding.policyArea] = (summary.byPolicyArea[finding.policyArea] || 0) + 1;
    summary.byRule[finding.rule] = (summary.byRule[finding.rule] || 0) + 1;
  }

  return summary;
}

export function buildCompilerPolicyIssueSummary(findings = []) {
  const summary = summarizeCompilerPolicyDrift(findings);
  const severity = summary.high > 0 ? COMPILER_POLICY_SEVERITY.HIGH : COMPILER_POLICY_SEVERITY.MEDIUM;
  const sampleRules = findings.map((finding) => finding.rule).slice(0, 3).join(', ');
  const reuseGuidance = findings
    .map((finding) => finding.reuseGuidance)
    .filter(Boolean);

  return {
    severity,
    summary,
    sampleRules,
    reuseGuidance,
    message: `${summary.total} compiler policy drift finding(s): ${sampleRules}`.trim()
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
