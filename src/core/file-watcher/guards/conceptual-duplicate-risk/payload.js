import { buildDuplicateDebtHistory } from '../../../../shared/compiler/index.js';
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
        findings,
        maxFindings,
        debtHistory,
        severity
    });

    return {
        preview,
        severity,
        debtHistory,
        context
    };
}
