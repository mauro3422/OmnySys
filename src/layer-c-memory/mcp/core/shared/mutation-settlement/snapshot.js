import { collectUniquePaths } from './paths.js';
import { reindexSettlementTargets } from './reindex.js';
import { settleMutationTarget } from './validation.js';

export function buildMutationSettlementSnapshot({
  reason = 'mutation',
  touchedFiles = [],
  validationTargets = [],
  reindexTargets = []
} = {}) {
  const normalizedTouchedFiles = collectUniquePaths(touchedFiles);

  return {
    createdAt: new Date().toISOString(),
    reason,
    touchedFiles: normalizedTouchedFiles,
    validationTargets: collectUniquePaths(validationTargets.length > 0 ? validationTargets : normalizedTouchedFiles),
    reindexTargets: collectUniquePaths(reindexTargets)
  };
}

export async function settleMutationSnapshot({
  projectPath,
  context = {},
  snapshot = null,
  retryOptions = {},
  validationOptions = {},
  maxValidationTargets = 10,
  allowReindexOnTransient = true
} = {}) {
  const validationTargets = collectUniquePaths(snapshot?.validationTargets || snapshot?.touchedFiles || [])
    .slice(0, maxValidationTargets);
  const reindexResults = await reindexSettlementTargets(projectPath, snapshot?.reindexTargets || []);
  const validations = [];

  for (const filePath of validationTargets) {
    validations.push(
      await settleMutationTarget({
        projectPath,
        filePath,
        context,
        allowReindexOnTransient,
        retryOptions,
        validationOptions
      })
    );
  }

  const settledCount = validations.filter((entry) => entry.settled).length;
  const transientCount = validations.filter((entry) => entry.transient).length;
  const issueCount = validations.filter((entry) => {
    const validation = entry.validation || {};
    return validation.success === false && !entry.transient;
  }).length;

  return {
    success: true,
    settled: transientCount === 0,
    reason: snapshot?.reason || 'mutation',
    reindexResults,
    validations,
    summary: {
      validationTargets: validationTargets.length,
      reindexedCount: reindexResults.filter((entry) => entry.success).length,
      settledCount,
      transientCount,
      issueCount
    }
  };
}

export async function settleMutationFiles({
  projectPath,
  context = {},
  reason = 'mutation',
  touchedFiles = [],
  validationTargets = [],
  reindexTargets = [],
  retryOptions = {},
  validationOptions = {},
  maxValidationTargets = 10,
  allowReindexOnTransient = true
} = {}) {
  return await settleMutationSnapshot({
    projectPath,
    context,
    snapshot: buildMutationSettlementSnapshot({
      reason,
      touchedFiles,
      validationTargets,
      reindexTargets
    }),
    retryOptions,
    validationOptions,
    maxValidationTargets,
    allowReindexOnTransient
  });
}

export default {
  buildMutationSettlementSnapshot,
  settleMutationFiles,
  settleMutationSnapshot
};
