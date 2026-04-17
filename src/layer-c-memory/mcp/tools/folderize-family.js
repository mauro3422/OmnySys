import { createLogger } from '../../../utils/logger.js';
import { getRepository } from '../../storage/repository/repository-factory.js';
import { buildFolderizationMigrationPlanFromRepo, buildFolderizationMoveSnapshot, loadCompilerExplainability } from '../../../shared/compiler/index.js';
import { executeFolderizationPlan } from './folderize-family-plan-runner.js';
import { validatePlannedFolderizedImports } from './folderize-family-import-rewriter.js';

const logger = createLogger('OmnySys:mcp:folderize_family');

function collectFolderizationExecutionTargets(focusPlan = null) {
  const targets = new Set();

  const addPath = (value) => {
    const normalized = String(value || '').trim();
    if (normalized) {
      targets.add(normalized);
    }
  };

  addPath(focusPlan?.candidate?.barrelFile);

  for (const target of Array.isArray(focusPlan?.moveTargets) ? focusPlan.moveTargets : []) {
    addPath(target?.from);
    addPath(target?.to);
  }

  for (const target of Array.isArray(focusPlan?.renameTargets) ? focusPlan.renameTargets : []) {
    addPath(target?.from);
    addPath(target?.to);
  }

  for (const impacted of Array.isArray(focusPlan?.importImpact?.impactedFiles) ? focusPlan.importImpact.impactedFiles : []) {
    addPath(impacted?.filePath || impacted);
  }

  return Array.from(targets);
}

async function buildFolderizationExecutionGate({ projectPath, candidatePath, focusPlan, context }) {
  const sharedState = context?.sharedState || context?.orchestrator?.sharedState || {};
  const explainability = await loadCompilerExplainability(projectPath, [], sharedState, null, {
    focusPath: candidatePath,
    filePaths: collectFolderizationExecutionTargets(focusPlan),
    forceFresh: false
  });

  const databaseHealth = explainability?.databaseHealth || null;
  const folderizationAutomation = explainability?.folderization?.automation || null;
  const systemInventory = explainability?.systemInventory || null;
  const canonicalPromotion = explainability?.canonicalPromotion || null;
  const propagationLedger = explainability?.propagationLedger || null;
  const executionReady = Boolean(
    databaseHealth?.healthy === true
    && folderizationAutomation?.shouldExecute === true
    && folderizationAutomation?.executionTarget === 'folderize_family'
  );

  const gate = {
    success: executionReady,
    databaseHealth,
    automation: folderizationAutomation,
    systemInventory,
    canonicalPromotion,
    propagationLedger,
    summaryText: [
      `db=${databaseHealth?.healthy === true ? 'healthy' : 'blocked'}`,
      `automation=${folderizationAutomation?.automationState || 'missing'}`,
      `target=${folderizationAutomation?.executionTarget || 'missing'}`,
      `naming=${folderizationAutomation?.normalizationSafetyLevel || 'unknown'}`,
      `propagation=${folderizationAutomation?.propagationMode || 'unknown'}`,
      `inventory=${folderizationAutomation?.systemInventoryState || systemInventory?.inventoryState || 'unknown'}`
    ].join(' | '),
    reason: executionReady
      ? 'Folderization execution gate approved.'
      : folderizationAutomation?.reason || databaseHealth?.summary?.reason || 'Folderization execution gate rejected.',
    nextAction: executionReady
      ? folderizationAutomation?.nextAction || 'Execute the folderization transaction.'
      : folderizationAutomation?.nextAction || 'Repair metadata, inventory, naming, or propagation drift before execution.'
  };

  if (executionReady === false) {
    gate.blockers = {
      databaseHealth: databaseHealth?.healthy === true ? null : databaseHealth?.summary || databaseHealth?.reason || 'Database health is not ready.',
      automationState: folderizationAutomation?.automationState || 'missing',
      automationReason: folderizationAutomation?.reason || null,
      normalizationSafetyLevel: folderizationAutomation?.normalizationSafetyLevel || null,
      propagationMode: folderizationAutomation?.propagationMode || null,
      propagationAdoptionState: folderizationAutomation?.propagationAdoptionState || null,
      systemInventoryState: folderizationAutomation?.systemInventoryState || systemInventory?.inventoryState || null,
      policyCoverageState: folderizationAutomation?.policyCoverageState || systemInventory?.policyCoverage?.coverageState || null,
      canonicalPromotionState: canonicalPromotion?.promotionState || null
    };
  }

  return gate;
}

async function runFolderizationRequest({
  candidatePath,
  execute,
  validateAfterMove,
  projectPath,
  context,
  server
}) {
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

  const folderizationSnapshot = buildFolderizationMoveSnapshot(focusPlan);
  const moveContext = {
    ...context,
    folderizationSnapshot
  };

  const executionGate = await buildFolderizationExecutionGate({
    projectPath,
    candidatePath,
    focusPlan,
    context
  });

  if (!execute) {
    return {
      success: true,
      mode: 'preview',
      plan: focusPlan,
      gate: executionGate
    };
  }

  if (focusPlan.decision === 'reject') {
    logger.error(`[Tool] folderize_family rejected plan for ${candidatePath}: ${focusPlan.reason || 'blocked by plan decision'}`);
    return {
      success: false,
      mode: 'blocked',
      plan: focusPlan,
      gate: executionGate,
      error: `Folderization plan rejected for ${candidatePath}`
    };
  }

  if (!executionGate.success) {
    logger.error(`[Tool] folderize_family execution gate rejected for ${candidatePath}: ${executionGate.reason || 'gate blocked'}`);
    return {
      success: false,
      mode: 'blocked',
      plan: focusPlan,
      gate: executionGate,
      error: executionGate.reason || `Folderization execution gate rejected for ${candidatePath}`
    };
  }

  const preflight = await validatePlannedFolderizedImports({
    projectPath,
    moveTargets: focusPlan.moveTargets || [],
    impactedFiles: focusPlan.importImpact?.impactedFiles?.map((item) => item.filePath) || [],
    context: moveContext
  });

  if (!preflight.success) {
    logger.error(`[Tool] folderize_family preflight failed for ${candidatePath}: ${preflight.errors?.length || 0} import resolution issue(s)`);
    return {
      success: false,
      mode: 'preflight_failed',
      plan: focusPlan,
      gate: executionGate,
      preflight,
      error: `Folderization preflight failed for ${candidatePath}`
    };
  }

  return await executeFolderizationPlan({
    focusPlan,
    projectPath,
    context,
    moveContext,
    server,
    validateAfterMove,
    executionGate
  });
}

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
    return await runFolderizationRequest({
      candidatePath,
      execute,
      validateAfterMove,
      projectPath,
      context,
      server
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
