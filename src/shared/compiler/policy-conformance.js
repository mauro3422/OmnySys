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
  RUNTIME_OWNERSHIP: 'runtime_ownership'
};

function normalizePath(filePath = '') {
  return filePath.replace(/\\/g, '/');
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

function looksLikeManualPipelineOrphanScan(source = '') {
  return (
    /(called_by_json|calls_json|callers_count|callees_count)/.test(source) &&
    /(pipeline_orphans|orphanFunctions|patternCondition|fileLevelImportEvidence|disconnected pipeline)/i.test(source)
  );
}

function looksLikeManualRuntimeOwnership(source = '') {
  return (
    /(daemon-owner-|ownerLockPath|OWNER_LOCK_PATH|readOwnerLock|writeOwnerLock|waitForExistingOwner|removeOwnerLock)/.test(source) &&
    /(process\.kill\(.*0\)|unlink\(|writeFileSync\(|readFile\(|state=.*restarting|state=.*starting)/.test(source)
  );
}

export function detectCompilerPolicyDriftFromSource(filePath, source = '') {
  const normalizedPath = normalizePath(filePath);
  const findings = [];

  if (!shouldScanCompilerFile(normalizedPath) || !source) {
    return findings;
  }

  if (
    normalizedPath.endsWith('/guard-standards.js') ||
    normalizedPath.endsWith('/shared-state-guard.js')
  ) {
    return findings;
  }

  const importsGetAllAtoms = /getAllAtoms/.test(source);
  const importsImpactApis = /getFileDependents|getTransitiveDependents|getFileImpactSummary|classifyImpactSeverity/.test(source);
  const importsDuplicateApi = /getDuplicateKeySqlForMode|getDuplicateKeySql|getStructuralDuplicateKeySql|buildDuplicateWhereSql|normalizeDuplicateCandidateAtom|getValidDnaPredicate|DUPLICATE_MODES/.test(source);
  const importsFileDiscoveryApi = /discoverCompilerFiles|discoverProjectSourceFiles|isCompilerRuntimeFile/.test(source);
  const importsSignalCoverageApi = /summarizeDerivedScoreCoverage|summarizeSemanticCoverage|classifyFieldCoverage/.test(source);
  const importsLiveRowDriftApi = /getLiveRowDriftSummary|getStaleTableRowCount|getLiveFileTotal|getLiveFileSetSql/.test(source);
  const importsPipelineOrphansApi = /classifyPipelineOrphans|getPipelineNamePatternSqlCondition|isLikelyDisconnectedPipelineAtom|normalizePipelineOrphan/.test(source);
  const importsRuntimeOwnershipApi = /getDaemonOwnerLockPath|writeDaemonOwnerLockSync|removeDaemonOwnerLockSync|readDaemonOwnerLock|waitForDaemonOwner|isCompilerProcessAlive/.test(source);

  if (
    importsGetAllAtoms &&
    /atom\.name\s*===\s*symbolName|instance\.name\s*===\s*symbolName/.test(source)
  ) {
    findings.push(createFinding(
      'manual_symbol_duplicate_scan',
      COMPILER_POLICY_SEVERITY.MEDIUM,
      COMPILER_POLICY_AREA.DUPLICATES,
      'Manual symbol duplicate scan detected',
      'Use repository-backed duplicate/symbol APIs instead of scanning getAllAtoms() in memory.'
    ));
  }

  if (
    importsGetAllAtoms &&
    looksLikeManualTopologyScan(source) &&
    !importsImpactApis
  ) {
    findings.push(createFinding(
      'manual_topology_scan',
      COMPILER_POLICY_SEVERITY.HIGH,
      COMPILER_POLICY_AREA.IMPACT,
      'Manual topology/impact scan detected',
      'Use the canonical impact APIs (getFileImpactSummary / getFileDependents / getTransitiveDependents) instead of rebuilding impact from getAllAtoms().'
    ));
  }

  if (
    /json_extract\([^)]*dna_json/.test(source) &&
    /duplicate_key|DuplicateGroups/.test(source) &&
    !importsDuplicateApi &&
    !normalizedPath.endsWith('/duplicate-dna.js')
  ) {
    findings.push(createFinding(
      'manual_duplicate_sql',
      COMPILER_POLICY_SEVERITY.HIGH,
      COMPILER_POLICY_AREA.DUPLICATES,
      'Manual duplicate DNA SQL detected',
      'Build duplicate keys through duplicate-dna.js / repository utils barrel instead of embedding SQL fragments.'
    ));
  }

  if (
    /fs\.readdir|fs\.readFile/.test(source) &&
    /collectFilesRecursively|readdirSync|walkDir|walkDirectory/.test(source) &&
    (normalizedPath.includes('/mcp/') || normalizedPath.includes('/shared/compiler/')) &&
    !importsFileDiscoveryApi
  ) {
    findings.push(createFinding(
      'manual_file_discovery_scan',
      COMPILER_POLICY_SEVERITY.MEDIUM,
      COMPILER_POLICY_AREA.FILE_DISCOVERY,
      'Manual file discovery scan detected inside MCP/compiler runtime',
      'Prefer canonical query/storage APIs before walking the filesystem manually inside MCP/runtime code.'
    ));
  }

  if (
    looksLikeManualDerivedScoreCoverage(source) &&
    !importsSignalCoverageApi &&
    !normalizedPath.endsWith('/signal-coverage.js')
  ) {
    findings.push(createFinding(
      'manual_signal_coverage_scan',
      COMPILER_POLICY_SEVERITY.MEDIUM,
      COMPILER_POLICY_AREA.SIGNAL_COVERAGE,
      'Manual derived-score coverage scan detected',
      'Use summarizeDerivedScoreCoverage / classifyFieldCoverage from shared/compiler instead of recomputing coverage locally.'
    ));
  }

  if (
    looksLikeManualSemanticCoverage(source) &&
    !importsSignalCoverageApi &&
    !normalizedPath.endsWith('/signal-coverage.js')
  ) {
    findings.push(createFinding(
      'manual_semantic_coverage_scan',
      COMPILER_POLICY_SEVERITY.MEDIUM,
      COMPILER_POLICY_AREA.SIGNAL_COVERAGE,
      'Manual semantic coverage scan detected',
      'Use summarizeSemanticCoverage from shared/compiler instead of rebuilding semantic coverage heuristics locally.'
    ));
  }

  if (
    looksLikeManualLiveRowDrift(source) &&
    !importsLiveRowDriftApi &&
    !normalizedPath.endsWith('/live-row-drift.js')
  ) {
    findings.push(createFinding(
      'manual_live_row_drift_scan',
      COMPILER_POLICY_SEVERITY.MEDIUM,
      COMPILER_POLICY_AREA.LIVE_ROW_DRIFT,
      'Manual live/stale row drift logic detected',
      'Use getLiveRowDriftSummary / getStaleTableRowCount from shared/compiler instead of hand-rolling stale row SQL.'
    ));
  }

  if (
    looksLikeManualPipelineOrphanScan(source) &&
    !importsPipelineOrphansApi &&
    !normalizedPath.endsWith('/pipeline-orphans.js')
  ) {
    findings.push(createFinding(
      'manual_pipeline_orphan_scan',
      COMPILER_POLICY_SEVERITY.MEDIUM,
      COMPILER_POLICY_AREA.PIPELINE_ORPHANS,
      'Manual pipeline orphan classification detected',
      'Use classifyPipelineOrphans / getPipelineNamePatternSqlCondition from shared/compiler instead of rebuilding orphan heuristics inline.'
    ));
  }

  if (
    looksLikeManualRuntimeOwnership(source) &&
    !importsRuntimeOwnershipApi &&
    !normalizedPath.endsWith('/runtime-ownership.js')
  ) {
    findings.push(createFinding(
      'manual_runtime_ownership',
      COMPILER_POLICY_SEVERITY.MEDIUM,
      COMPILER_POLICY_AREA.RUNTIME_OWNERSHIP,
      'Manual daemon ownership/lock logic detected',
      'Use runtime-ownership.js from shared/compiler instead of reimplementing daemon owner lock handling inline.'
    ));
  }

  return findings;
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

  return {
    severity,
    summary,
    sampleRules,
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
