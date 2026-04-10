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
  detectCompilerPolicyDriftFromSource,
  buildPropagationPlan,
  buildPolicyDriftPropagationPlan,
  summarizePropagationPlan
} from '../../../shared/compiler/index.js';

const logger = createLogger('OmnySys:file-watcher:guards:compiler-policy');

function buildSuggestedAlternatives(findings = [], reuseGuidance = []) {
  const alternatives = new Set(findings.map((finding) => finding.recommendation).filter(Boolean));

  for (const guidance of reuseGuidance) {
    if (guidance?.recommendedReplacement) {
      alternatives.add(guidance.recommendedReplacement);
    }
    if (guidance?.recommendedImport?.from && guidance?.recommendedImport?.symbols?.length) {
      alternatives.add(
        `Import sugerido: { ${guidance.recommendedImport.symbols.join(', ')} } desde ${guidance.recommendedImport.from}`
      );
    }
  }

  return [...alternatives];
}

export async function detectCompilerPolicyConformance(rootPath, filePath) {
  if (!rootPath || !filePath) {
    logger.debug(`Skipping compiler policy conformance guard due to missing path context (rootPath=${rootPath || 'missing'}, filePath=${filePath || 'missing'})`);
    return [];
  }

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
  const propagationPlan = buildPolicyDriftPropagationPlan({
    scopePath: rootPath,
    focusPath: filePath,
    severity,
    findingCount: findings.length,
    ruleCount: Object.keys(summary.byRule || {}).length,
    policyAreaCount: Object.keys(summary.byPolicyArea || {}).length,
    impactedFileCount: 1,
    rewriteCount: findings.length,
    candidateCount: findings.length,
    topCandidates: findings.slice(0, 5).map((finding) => ({
      name: finding.rule || finding.policyArea || finding.name || null,
      filePath
    })),
    guidance: 'Treat policy drift as a propagation signal for technical debt, governance, and canonical helper adoption before mutating more surfaces.',
    recommendationStrategy: 'policy_drift',
    drift: {
      state: severity === 'high' ? 'watch' : 'stable',
      reason: `policy drift severity ${severity}`
    }
  });
  const propagation = summarizePropagationPlan(propagationPlan);
  const issueType = createIssueType(IssueDomains.ARCH, 'policy_drift', severity);
  const context = createStandardContext({
    guardName: 'compiler-policy-conformance-guard',
    severity,
    suggestedAction: 'Replace ad-hoc policy logic with the canonical compiler API entrypoint for this signal.',
    suggestedAlternatives: buildSuggestedAlternatives(findings, reuseGuidance),
    extraData: {
      byPolicyArea: summary.byPolicyArea,
      byRule: summary.byRule,
      findings,
      reuseGuidance,
      propagation
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
