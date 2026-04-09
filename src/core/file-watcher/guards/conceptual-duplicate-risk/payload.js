import { buildDuplicateDebtHistory } from '../../../../shared/compiler/duplicate-debt/history.js';
import { buildConceptualSeverity } from './severity.js';
import { buildConceptualContext } from './context.js';

export function buildConceptualDuplicateReportPayload({
    normalizedFilePath,
    findings,
    previousFindings,
    maxFindings
}) {
    const preview = findings
        .map((finding) => `${finding.symbol}(${finding.semanticFingerprint})`)
        .join(', ');
    const severity = buildConceptualSeverity(findings);
    const debtHistory = buildDuplicateDebtHistory(normalizedFilePath, findings, previousFindings);
    const context = buildConceptualContext({
        normalizedFilePath,
        findings,
        maxFindings,
        debtHistory,
        severity
    });
    const propagation = context.propagation || context.extraData?.propagation || null;

    return {
        preview,
        severity,
        debtHistory,
        context,
        propagation
    };
}
