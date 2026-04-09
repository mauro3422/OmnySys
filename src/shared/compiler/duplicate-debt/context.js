export function buildDuplicateContext(currentFindings = [], debtHistory = null) {
  return {
    findings: currentFindings,
    debtHistory: debtHistory ? {
      summary: debtHistory.summary,
      score: debtHistory.debt.score,
      trend: debtHistory.debt.trend,
      level: debtHistory.debt.level
    } : null,
    recommendations: debtHistory?.recommendations || []
  };
}
