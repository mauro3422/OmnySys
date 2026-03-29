import { persistWatcherIssue, clearWatcherIssue, clearWatcherIssueFamily } from '../../watcher-issue-persistence.js';
import { createLogger } from '../../../../utils/logger.js';
import { createIssueType, IssueDomains, isValidGuardTarget } from '../guard-standards.js';
import { analyzeAtomDataFlow } from './index.js';
import { analyzeAtomNaming } from '../integrity-guard-naming.js';
import { clearIntegrityIssues } from './persistence.js';

const logger = createLogger('OmnySys:file-watcher:guards:integrity');

export async function detectIntegrityViolations(rootPath, filePath, EventEmitterContext, atoms = [], options = {}) {
  const { verbose = true } = options;

  try {
    if (!atoms || atoms.length === 0) {
      await clearIntegrityIssues(rootPath, filePath);
      return null;
    }

    const violations = atoms.flatMap((atom) => {
      if (!isValidGuardTarget(atom)) {
        return [];
      }

      return [
        ...analyzeAtomDataFlow(atom),
        ...analyzeAtomNaming(atom)
      ];
    });

    if (violations.length === 0) {
      await clearIntegrityIssues(rootPath, filePath);
      return null;
    }

    const highIssues = violations.filter((v) => v.severity === 'high');
    const mediumIssues = violations.filter((v) => v.severity === 'medium');
    const lowIssues = violations.filter((v) => v.severity === 'low');

    const severity = highIssues.length > 0 ? 'high' : (mediumIssues.length > 0 ? 'medium' : 'low');
    const mainViolation = highIssues[0] || mediumIssues[0] || lowIssues[0];

    if (verbose) {
      logger.warn(`[INTEGRITY][${severity.toUpperCase()}] ${filePath}: ${mainViolation.message} (+${violations.length - 1} more)`);
    }

    EventEmitterContext.emit('integrity:violation', {
      filePath,
      severity,
      message: mainViolation.message,
      totalViolations: violations.length,
      bySeverity: {
        high: highIssues.length,
        medium: mediumIssues.length,
        low: lowIssues.length
      },
      violations: violations.map((v) => ({
        atomName: v.atomName,
        type: v.type,
        severity: v.severity,
        message: v.message
      }))
    });

    const issueType = createIssueType(IssueDomains.SEM, 'data_flow', severity);
    await persistWatcherIssue(
      rootPath,
      filePath,
      issueType,
      severity,
      `[${violations.length} violation(s)] ${mainViolation.message}`,
      {
        totalViolations: violations.length,
        bySeverity: { high: highIssues.length, medium: mediumIssues.length, low: lowIssues.length },
        violations: violations.map((v) => v.context)
      }
    );

    if (severity !== 'high') await clearWatcherIssue(rootPath, filePath, 'sem_data_flow_high');
    if (severity !== 'medium') await clearWatcherIssue(rootPath, filePath, 'sem_data_flow_medium');
    if (severity !== 'low') await clearWatcherIssue(rootPath, filePath, 'sem_data_flow_low');

    return { severity, totalViolations: violations.length, violations };
  } catch (error) {
    logger.debug(`[INTEGRITY GUARD SKIP] ${filePath}: ${error.message}`);
    return null;
  }
}
