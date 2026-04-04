import { getRepository } from '../../storage/repository/repository-factory.js';
import { buildFolderizationNormalizationPlanFromRepo } from '../../../shared/compiler/index.js';
import { rename_folderized_family } from './rename-folderized-family.js';

function resolveRequestedMode(args = {}) {
  if (args.mode) {
    return args.mode;
  }

  return args.execute ? 'execute' : 'plan';
}

/**
 * Canonical standalone entrypoint for folderized-name normalization.
 *
 * The wrapper now acts as a safe planner:
 * - analyze: inspect naming debt only
 * - plan: return a bounded normalization plan
 * - execute: delegate to the rename tool when the plan is acceptable
 */
export async function normalize_folderized_family_names(args = {}, context = {}) {
  const candidatePath = args.candidatePath || null;
  if (!candidatePath) {
    return {
      success: false,
      error: 'Missing required parameter: candidatePath'
    };
  }

  const mode = resolveRequestedMode(args);
  const { projectPath } = context;
  const repo = projectPath ? getRepository(projectPath) : null;
  const normalization = buildFolderizationNormalizationPlanFromRepo(repo, [candidatePath], {
    ...args,
    mode
  });

  if (!normalization?.success) {
    return {
      success: false,
      mode,
      normalization,
      error: normalization?.summary?.recommendedAction === 'noop'
        ? 'Repository unavailable or folderized family normalization plan not found.'
        : 'Unable to build folderized family normalization plan.'
    };
  }

  if (mode === 'analyze') {
    return {
      success: true,
      mode,
      normalization: {
        ...normalization,
        plan: null
      }
    };
  }

  if (mode !== 'execute' || normalization.summary?.recommendedAction !== 'execute') {
    return {
      success: true,
      mode: 'preview',
      normalization
    };
  }

  const executionResult = await rename_folderized_family(
    {
      candidatePath,
      execute: true,
      validateAfterMove: args.validateAfterMove ?? true
    },
    context
  );

  return {
    ...executionResult,
    mode: executionResult?.success ? 'applied' : executionResult?.mode || 'failed',
    normalization
  };
}

export default { normalize_folderized_family_names };
