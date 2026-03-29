import { persistWatcherIssue, clearWatcherIssue } from '../../watcher-issue-persistence.js';
import { createLogger } from '../../../../utils/logger.js';
import { IssueDomains, createIssueType } from '../guard-standards.js';

const logger = createLogger('OmnySys:file-watcher:guards:impact');

export async function reportImpactWaveFinding(rootPath, filePath, evidence, EventEmitterContext) {
    const { severity, score, summary, issueContext } = evidence;
    logger.warn(
        `[IMPACT WAVE][${severity.toUpperCase()}] ${filePath}: atoms=${summary.changedAtoms}, related=${summary.relatedFiles}, brokenImports=${summary.brokenImports}, brokenCallers=${summary.brokenCallers}, score=${summary.score}`
    );

    const issueType = createIssueType(IssueDomains.ARCH, 'impact', severity);
    await persistWatcherIssue(
        rootPath,
        filePath,
        issueType,
        severity,
        `Impact wave ${severity}: ${summary.relatedFiles} related file(s), score=${score}`,
        issueContext
    );

    if (severity !== 'high') await clearWatcherIssue(rootPath, filePath, 'arch_impact_high');
    if (severity !== 'medium') await clearWatcherIssue(rootPath, filePath, 'arch_impact_medium');
    if (severity !== 'low') await clearWatcherIssue(rootPath, filePath, 'arch_impact_low');

    EventEmitterContext.emit('arch:impact-wave', {
        filePath,
        ...summary,
        sample: issueContext.extraData.sample
    });

    return summary;
}
