/**
 * @fileoverview Canonical reuse guidance for compiler policy drift findings.
 *
 * Turns abstract drift findings into actionable reuse hints so agents and
 * watcher diagnostics can reconnect code to the canonical entrypoint instead
 * of only reporting that a policy was bypassed.
 *
 * @module shared/compiler/canonical-reuse-guidance
 */

const RULE_GUIDANCE = {
  manual_topology_scan: {
    existingCanonicalEntryPoint: 'getFileImpactSummary',
    recommendedImport: "import { getFileImpactSummary } from '../../../shared/compiler/index.js'",
    recommendedReplacement: 'Replace local topology walking with getFileImpactSummary / dependency-query helpers.'
  },
  manual_duplicate_sql: {
    existingCanonicalEntryPoint: 'getDuplicateKeySqlForMode',
    recommendedImport: "import { getDuplicateKeySqlForMode } from '../../../layer-c-memory/storage/repository/utils/index.js'",
    recommendedReplacement: 'Build duplicate grouping through duplicate-dna/repository utils instead of embedding dna_json SQL.'
  },
  manual_file_discovery_scan: {
    existingCanonicalEntryPoint: 'discoverProjectSourceFiles',
    recommendedImport: "import { discoverProjectSourceFiles } from '../../../shared/compiler/index.js'",
    recommendedReplacement: 'Use the canonical file discovery API instead of walking the filesystem inline.'
  },
  manual_signal_coverage_scan: {
    existingCanonicalEntryPoint: 'summarizeDerivedScoreCoverage',
    recommendedImport: "import { summarizeDerivedScoreCoverage } from '../../../shared/compiler/index.js'",
    recommendedReplacement: 'Read derived score coverage through summarizeDerivedScoreCoverage / classifyFieldCoverage.'
  },
  manual_semantic_coverage_scan: {
    existingCanonicalEntryPoint: 'summarizeSemanticCoverage',
    recommendedImport: "import { summarizeSemanticCoverage } from '../../../shared/compiler/index.js'",
    recommendedReplacement: 'Reuse summarizeSemanticCoverage instead of rebuilding semantic coverage heuristics.'
  },
  manual_live_row_drift_scan: {
    existingCanonicalEntryPoint: 'getLiveRowDriftSummary',
    recommendedImport: "import { getLiveRowDriftSummary } from '../../../shared/compiler/index.js'",
    recommendedReplacement: 'Reuse getLiveRowDriftSummary / reconciliation helpers instead of hand-rolled stale row SQL.'
  },
  live_row_sync_missing: {
    existingCanonicalEntryPoint: 'ensureLiveRowSync',
    recommendedImport: "import { ensureLiveRowSync } from '../../../shared/compiler/index.js'",
    recommendedReplacement: 'Use ensureLiveRowSync as the canonical runtime entrypoint so drift is reconciled before reporting support-table counts.'
  },
  manual_pipeline_orphan_scan: {
    existingCanonicalEntryPoint: 'classifyPipelineOrphans',
    recommendedImport: "import { classifyPipelineOrphans } from '../../../shared/compiler/index.js'",
    recommendedReplacement: 'Use classifyPipelineOrphans / pipeline orphan reporting helpers.'
  },
  manual_runtime_ownership: {
    existingCanonicalEntryPoint: 'readDaemonOwnerLock',
    recommendedImport: "import { readDaemonOwnerLock, waitForDaemonOwner } from '../../../shared/compiler/index.js'",
    recommendedReplacement: 'Reuse runtime ownership APIs instead of open-coding daemon lock lifecycle.'
  },
  manual_shared_state_hotspot_key: {
    existingCanonicalEntryPoint: 'buildCompilerStandardizationReport',
    recommendedImport: "import { buildCompilerStandardizationReport } from '../../../shared/compiler/index.js'",
    recommendedReplacement: 'Read shared-state contention from canonical compiler/shared-state reporting instead of hardcoding hotspot keys inline.'
  },
  manual_shared_state_hotspot_scan: {
    existingCanonicalEntryPoint: 'buildCompilerStandardizationReport',
    recommendedImport: "import { buildCompilerStandardizationReport } from '../../../shared/compiler/index.js'",
    recommendedReplacement: 'Promote shared-state hotspot analysis to the canonical compiler reporting layer.'
  },
  overloaded_service_boundary: {
    existingCanonicalEntryPoint: 'canonical service helper',
    recommendedImport: null,
    recommendedReplacement: 'Split the module so each boundary delegates to the canonical service/helper for that concern.'
  },
  missing_compiler_service_bridge: {
    existingCanonicalEntryPoint: 'compiler-persistence helpers',
    recommendedImport: "import { hasPersistedCompilerAnalysis, getPersistedIndexedFilePaths, cleanupOrphanedCompilerArtifacts } from '../../../shared/compiler/index.js'",
    recommendedReplacement: 'Route filesystem + persistence coupling through shared/compiler compiler-persistence helpers instead of opening fs + repository logic inline.'
  },
  scanned_file_manifest: {
    existingCanonicalEntryPoint: 'syncPersistedScannedFileManifest',
    recommendedImport: "import { syncPersistedScannedFileManifest, getPersistedKnownFilePaths } from '../../../shared/compiler/index.js'",
    recommendedReplacement: 'Persist the scanned-file manifest before comparing scanner/hash/index universes so zero-atom files stay visible without forcing duplicate recovery.'
  }
};

const AREA_FALLBACK_GUIDANCE = {
  impact: RULE_GUIDANCE.manual_topology_scan,
  duplicates: RULE_GUIDANCE.manual_duplicate_sql,
  file_discovery: RULE_GUIDANCE.manual_file_discovery_scan,
  signal_coverage: RULE_GUIDANCE.manual_signal_coverage_scan,
  live_row_drift: RULE_GUIDANCE.manual_live_row_drift_scan,
  pipeline_orphans: RULE_GUIDANCE.manual_pipeline_orphan_scan,
  runtime_ownership: RULE_GUIDANCE.manual_runtime_ownership,
  shared_state_hotspots: RULE_GUIDANCE.manual_shared_state_hotspot_scan
};

export function buildCanonicalReuseGuidance(finding = {}) {
  const byRule = RULE_GUIDANCE[finding?.rule];
  const byArea = AREA_FALLBACK_GUIDANCE[finding?.policyArea];
  const guidance = byRule || byArea || null;

  if (!guidance) {
    return null;
  }

  return {
    existingCanonicalEntryPoint: guidance.existingCanonicalEntryPoint,
    recommendedImport: guidance.recommendedImport,
    recommendedReplacement: guidance.recommendedReplacement
  };
}

