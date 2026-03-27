function generateDebtRecommendations(newFindings, persistentFindings, resolvedFindings) {
  const recommendations = [];

  if (persistentFindings.length > 3) {
    recommendations.push({
      priority: 'critical',
      action: 'High technical debt from persistent duplicates. Schedule refactoring sprint.',
      reason: `${persistentFindings.length} duplicate(s) carried over without resolution`
    });
  }

  if (newFindings.length > persistentFindings.length && newFindings.length > 2) {
    recommendations.push({
      priority: 'high',
      action: 'New duplicates detected faster than resolution. Review code review process.',
      reason: `${newFindings.length} new vs ${resolvedFindings.length} resolved`
    });
  }

  if (resolvedFindings.length > 0 && persistentFindings.length === 0 && newFindings.length === 0) {
    recommendations.push({
      priority: 'positive',
      action: 'All duplicates resolved. Consider adding duplicate detection to CI/CD.',
      reason: 'Clean state achieved'
    });
  }

  if (persistentFindings.length > 0 && newFindings.length === 0) {
    recommendations.push({
      priority: 'medium',
      action: 'Focus on resolving existing duplicates before adding new features.',
      reason: `${persistentFindings.length} persistent duplicate(s) blocking technical health`
    });
  }

  return recommendations;
}

export {
  generateDebtRecommendations
};
