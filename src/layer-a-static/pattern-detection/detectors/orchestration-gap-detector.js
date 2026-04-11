/**
 * @fileoverview orchestration-gap-detector.js
 *
 * Meta-detector that checks for missing links in the pipeline flow.
 * It looks for incomplete handoffs, missing consolidation hooks and
 * persistence/reporting gaps in the analysis pipeline.
 *
 * @module layer-a-static/pattern-detection/detectors/orchestration-gap-detector
 */

import { PatternDetector } from '../detector-base.js';
import {
  findFilePath,
  findGuardsWithPersistence,
  hasDebtReportGeneration,
  hasPostPhase2Hook,
  scoreOrchestrationGapFindings,
  summarizeOrchestrationGapFindings
} from './orchestration-gap-helpers.js';

export class OrchestrationGapDetector extends PatternDetector {
  constructor(options = {}) {
    super({
      id: 'orchestration-gaps',
      name: 'Orchestration Gap Detector',
      description: 'Detects missing connections between pipeline systems',
      ...options
    });
  }

  async detect(systemMap) {
    const findings = [];
    const files = systemMap?.files || {};

    const phase2IndexerPath = findFilePath(files, (path) => path.includes('phase2-indexer'));
    if (phase2IndexerPath && !hasPostPhase2Hook(files[phase2IndexerPath])) {
      findings.push({
        type: 'missing-post-phase2-consolidation',
        severity: 'high',
        file: phase2IndexerPath,
        message: 'Phase 2 indexer missing post-completion consolidation hook',
        recommendation: 'Add post-Phase 2 tasks for technical debt report generation',
        impact: 'Technical debt metrics not consolidated after deep scan'
      });
    }

    const mcpToolsPath = findFilePath(files, (path) => path.includes('technical-debt-report'));
    if (!mcpToolsPath) {
      findings.push({
        type: 'missing-debt-consolidation-tool',
        severity: 'medium',
        message: 'No MCP tool for consolidated technical debt report',
        recommendation: 'Create technical-debt-report.js MCP tool',
        impact: 'Users must manually query individual debt metrics'
      });
    }

    const guardsWithPersistence = findGuardsWithPersistence(files);
    if (guardsWithPersistence.length === 0) {
      findings.push({
        type: 'guards-not-persisting-findings',
        severity: 'high',
        message: 'No guards persisting findings to semantic_issues',
        recommendation: 'Ensure guards call persistWatcherIssue()',
        impact: 'Guard findings lost after execution'
      });
    }

    if (!hasDebtReportGeneration(files)) {
      findings.push({
        type: 'missing-automatic-debt-report',
        severity: 'medium',
        message: 'No automatic technical debt report generation',
        recommendation: 'Implement post-Phase 2 debt report consolidation',
        impact: 'Technical debt only visible via manual MCP tool calls'
      });
    }

    return this._summarize(findings);
  }

  _summarize(findings) {
    return {
      detector: 'orchestration-gap',
      findings,
      score: scoreOrchestrationGapFindings(findings),
      summary: summarizeOrchestrationGapFindings(findings),
      recommendations: findings.map((finding) => finding.recommendation)
    };
  }
}

export default OrchestrationGapDetector;
