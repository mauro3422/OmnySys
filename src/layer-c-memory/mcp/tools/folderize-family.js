import { createLogger } from '../../../utils/logger.js';
import { getRepository } from '../../storage/repository/repository-factory.js';
import { buildFolderizationMigrationPlanFromRepo } from '../../../shared/compiler/index.js';
import { buildFolderizationMoveSnapshot } from '../../../shared/compiler/index.js';
import { executeFolderizationPlan } from './folderize-family-plan-runner.js';

const logger = createLogger('OmnySys:mcp:folderize_family');

export async function folderize_family(args, context) {
  const {
    candidatePath,
    execute = false,
    validateAfterMove = true
  } = args;
  const { projectPath } = context;
  const server = context.server || context.orchestrator?.server || null;

  if (!candidatePath) {
    return { success: false, error: 'Missing required parameter: candidatePath' };
  }

  try {
    const plan = buildFolderizationMigrationPlanFromRepo(getRepository(projectPath), {
      focusCandidate: [candidatePath]
    });

    const focusPlan = plan.focusCandidate;
    if (!focusPlan) {
      return {
        success: false,
        error: `No folderization candidate found for ${candidatePath}`,
        plan
      };
    }

    if (!execute) {
      return {
        success: true,
        mode: 'preview',
        plan: focusPlan
      };
    }

    const folderizationSnapshot = buildFolderizationMoveSnapshot(focusPlan);
    const moveContext = {
      ...context,
      folderizationSnapshot
    };

    if (focusPlan.decision === 'reject') {
      logger.error(`[Tool] folderize_family rejected plan for ${candidatePath}: ${focusPlan.reason || 'blocked by plan decision'}`);
      return {
        success: false,
        mode: 'blocked',
        plan: focusPlan,
        error: `Folderization plan rejected for ${candidatePath}`
      };
    }

    return await executeFolderizationPlan({
      focusPlan,
      projectPath,
      context,
      moveContext,
      server,
      validateAfterMove
    });
  } catch (error) {
    logger.error(`[Tool] folderize_family failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

export default { folderize_family };