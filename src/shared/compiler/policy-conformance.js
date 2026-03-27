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
  discoverCompilerFiles,
  isCompilerRuntimeFile
} from './file-discovery.js';
import {
  collectManualPolicyFindingsForCompiler,
  collectConformanceFindingsForCompiler,
  buildCompilerPolicyImportMap
} from './policy-conformance-helpers.js';

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
  DATA_GATEWAY: 'data_gateway',
  ASYNC_ERROR: 'async_error',
  SHARED_STATE_HOTSPOTS: 'shared_state_hotspots',
  CENTRALITY_COVERAGE: 'centrality_coverage',
  TESTABILITY: 'testability',
  SEMANTIC_PURITY: 'semantic_purity',
  METADATA_PROPAGATION: 'metadata_propagation',
  SEMANTIC_SURFACE_GRANULARITY: 'semantic_surface_granularity',
  SUMMARY_PRESENTATION: 'summary_presentation',
  WATCHER_DIAGNOSTICS: 'watcher_diagnostics',
  WATCHER_LIFECYCLE: 'watcher_lifecycle',
  CANONICAL_BYPASS: 'canonical_bypass'
};

function normalizePathLocal(p) {
  return p ? p.replace(/\\/g, '/') : p;
}

export function detectCompilerPolicyDriftFromSource(filePath, source = '') {
  const normalizedPath = normalizePathLocal(filePath);

  if (!isCompilerRuntimeFile(normalizedPath) || !source) {
    return [];
  }

  if (
    normalizedPath.endsWith('/guard-standards.js') ||
    normalizedPath.endsWith('/shared-state-guard.js') ||
    normalizedPath.endsWith('/duplicate-conceptual-core.js')
  ) {
    return [];
  }

  const policyImports = buildCompilerPolicyImportMap(source);
  return [
    ...collectManualPolicyFindingsForCompiler(normalizedPath, source, policyImports),
    ...collectConformanceFindingsForCompiler(normalizedPath, source)
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
