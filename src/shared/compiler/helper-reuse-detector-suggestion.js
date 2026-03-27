export function buildReuseSuggestion(duplicateFile, existingHelpers) {
  if (existingHelpers.length === 0) {
    return null;
  }

  const sorted = [...existingHelpers].sort((a, b) => {
    if (a.isExported !== b.isExported) {
      return b.isExported ? 1 : -1;
    }
    return a.linesOfCode - b.linesOfCode;
  });

  const bestMatch = sorted[0];

  return {
    action: 'reuse_existing_helper',
    confidence: sorted.length > 1 ? 'high' : 'medium',
    existingHelper: {
      name: bestMatch.name,
      filePath: bestMatch.filePath,
      importStatement: `import { ${bestMatch.name} } from '${bestMatch.filePath.replace('.js', '')}';`,
      usage: `// Use ${bestMatch.name}() instead of duplicating logic`,
      reason: bestMatch.matchReason
    },
    alternatives: sorted.slice(1, 4).map((helper) => ({
      name: helper.name,
      filePath: helper.filePath,
      reason: helper.matchReason
    })),
    totalSimilarHelpers: sorted.length,
    recommendation: `Replace duplicate in ${duplicateFile} with existing helper ${bestMatch.name} in ${bestMatch.filePath}`
  };
}
