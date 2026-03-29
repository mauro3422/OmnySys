export function buildUnifiedDuplicateReportingPayload(summary, debtHistory) {
    const { allFindings, severity, issueType, preview, context } = summary;

    return {
        allFindings,
        severity,
        issueType,
        preview,
        context,
        message: `${allFindings.length} duplicate(s): ${preview}`,
        loggerMessage: `[UNIFIED DUPLICATE GUARD] ${allFindings.length} total -> ${preview} | Debt: ${debtHistory.debt.level} (${debtHistory.debt.score}/100, ${debtHistory.debt.trend})`,
        totalDuplicateCount: allFindings.length,
        structuralCount: summary.coordinated?.structural?.length ?? 0,
        conceptualCount: summary.coordinated?.conceptual?.length ?? 0,
        hasOverlap: summary.coordinated?.hasOverlap ?? false,
        debtScore: debtHistory.debt.score,
        debtTrend: debtHistory.debt.trend
    };
}
