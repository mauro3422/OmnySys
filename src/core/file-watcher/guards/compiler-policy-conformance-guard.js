/**
 * @fileoverview compiler-policy-conformance-guard.js
 *
 * Detecta deriva de políticas internas del compilador:
 * cuándo un módulo del watcher/MCP vuelve a implementar a mano lógica
 * que ya tiene un punto canónico de entrada.
 *
 * @module core/file-watcher/guards/compiler-policy-conformance-guard
 */

import fs from 'fs/promises';
import path from 'path';
import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { createLogger } from '../../../utils/logger.js';
import {
  IssueDomains,
  createIssueType,
  createStandardContext
} from './guard-standards.js';
import {
  buildCompilerPolicyIssueSummary,
  detectCompilerPolicyDriftFromSource
} from '../../../shared/compiler/index.js';

const logger = createLogger('OmnySys:file-watcher:guards:compiler-policy');

export async function detectCompilerPolicyConformance(rootPath, filePath) {
  const absolutePath = path.join(rootPath, filePath);
  const source = await fs.readFile(absolutePath, 'utf8').catch(() => null);
  if (!source) return [];

  const findings = detectCompilerPolicyDriftFromSource(filePath, source);

  if (findings.length === 0) {
    await clearWatcherIssue(rootPath, filePath, 'arch_policy_drift_high');
    await clearWatcherIssue(rootPath, filePath, 'arch_policy_drift_medium');
    return [];
  }

  const { severity, summary, message, reuseGuidance = [] } = buildCompilerPolicyIssueSummary(findings);
  const issueType = createIssueType(IssueDomains.ARCH, 'policy_drift', severity);
  const reuseAlternatives = reuseGuidance.flatMap((guidance) =>
    [
      guidance?.recommendedReplacement,
      guidance?.recommendedImport && `Import sugerido: ${guidance.recommendedImport}`
    ].filter(Boolean)
  );
  const context = createStandardContext({
    guardName: 'compiler-policy-conformance-guard',
    severity,
    suggestedAction: 'Replace ad-hoc policy logic with the canonical compiler API entrypoint for this signal.',
    suggestedAlternatives: [...new Set([...findings.map((finding) => finding.recommendation), ...reuseAlternatives])],
    extraData: {
      byPolicyArea: summary.byPolicyArea,
      byRule: summary.byRule,
      findings,
      reuseGuidance
    }
  });

  logger.warn(`[POLICY DRIFT][${severity.toUpperCase()}] ${filePath}: ${Object.keys(summary.byRule).join(', ')}`);

  await persistWatcherIssue(rootPath, filePath, issueType, severity, message, context);
  if (severity === 'high') {
    await clearWatcherIssue(rootPath, filePath, 'arch_policy_drift_medium');
  } else {
    await clearWatcherIssue(rootPath, filePath, 'arch_policy_drift_high');
  }

  return findings;
}

export default detectCompilerPolicyConformance;
